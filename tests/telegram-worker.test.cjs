const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  ts = require("typescript");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
global.Deno = { env: { get: () => "TEST_ONLY_TOKEN" } };
const {
  processTelegram,
} = require("../supabase/functions/_shared/telegram.ts");
function fixture() {
  const rows = {
    telegram_jobs: [
      {
        id: "job",
        family_id: "family",
        actor_id: "dad",
        recipient_id: "mom",
        source_table: "reminders",
        entity_id: "r",
        kind: "reminder_created",
        revision: 1,
        attempts: 0,
        state: "pending",
        expires_at: new Date(Date.now() + 60000).toISOString(),
      },
    ],
    telegram_links: [
      { user_id: "mom", chat_id: "123", enabled: true, confirmed_at: "today" },
    ],
    family_members: [{ user_id: "mom" }, { user_id: "dad" }].map((m) => ({
      ...m,
      family_id: "family",
    })),
    reminders: [
      {
        id: "r",
        family_id: "family",
        created_by: "dad",
        schedule_version: 1,
        acknowledged_at: null,
        completed_at: null,
        due_at: new Date(Date.now() + 3600000).toISOString(),
        title: "SECRET CHILD NAME",
        details: "SECRET MEDICINE",
      },
    ],
  };
  const admin = {
    rpc: async () => ({
      data: rows.telegram_jobs
        .filter((j) => j.state === "pending")
        .map((j) => {
          Object.assign(j, {
            state: "processing",
            lease_id: "lease",
            attempts: j.attempts + 1,
          });
          return { ...j };
        }),
      error: null,
    }),
    from: (table) => {
      const filters = [];
      let changes,
        single = false;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        gt(k, v) {
          filters.push((r) => r[k] > v);
          return q;
        },
        maybeSingle() {
          single = true;
          return q;
        },
        update(v) {
          changes = v;
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              const found = rows[table].filter((r) =>
                filters.every((f) => f(r)),
              );
              if (changes) found.forEach((r) => Object.assign(r, changes));
              return { data: single ? (found[0] ?? null) : found, error: null };
            })
            .then(resolve, reject);
        },
      };
      return q;
    },
  };
  return { admin, rows };
}
test("Telegram sends generic text only, correctly scoped callback; accepted is not acknowledged", async () => {
  const { admin, rows } = fixture();
  let payload;
  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return { json: async () => ({ ok: true, result: { message_id: 42 } }) };
  };
  assert.equal((await processTelegram(admin)).accepted, 1);
  assert.equal(payload.chat_id, "123");
  assert.equal(
    payload.reply_markup.inline_keyboard[0][0].callback_data,
    "ack:job",
  );
  assert.ok(!JSON.stringify(payload).includes("SECRET"));
  assert.equal(rows.telegram_jobs[0].state, "accepted");
  assert.equal(rows.reminders[0].acknowledged_at, null);
  assert.equal((await processTelegram(admin)).processed, 0);
});
test("Unlinked, former member, old revision or completed reminder never sends", async () => {
  for (const mutate of [
    (r) => (r.telegram_links[0].enabled = false),
    (r) => r.family_members.pop(),
    (r) => (r.reminders[0].schedule_version = 2),
    (r) => (r.reminders[0].completed_at = "today"),
    (r) => (r.reminders[0].acknowledged_at = "today"),
  ]) {
    const { admin, rows } = fixture();
    mutate(rows);
    let sent = false;
    global.fetch = async () => {
      sent = true;
      throw new Error("must not send");
    };
    await processTelegram(admin);
    assert.equal(sent, false);
    assert.equal(rows.telegram_jobs[0].state, "cancelled");
  }
});
test("429 obeys retry_after; blocked bot permanently fails; network failure never claims acceptance", async () => {
  for (const code of [429, 403, 0]) {
    const { admin, rows } = fixture();
    const before = Date.now();
    global.fetch = async () => {
      if (!code) throw new Error("fetch failed secret URL");
      return {
        json: async () => ({
          ok: false,
          error_code: code,
          parameters: { retry_after: 120 },
        }),
      };
    };
    assert.equal((await processTelegram(admin)).accepted, 0);
    const job = rows.telegram_jobs[0];
    assert.equal(job.state, code === 403 ? "failed" : "pending");
    assert.equal(job.lease_id, null);
    if (code === 429) assert.ok(Date.parse(job.due_at) >= before + 120000);
    assert.ok(!job.last_error.includes("secret"));
  }
});
