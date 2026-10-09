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
global.Deno = { env: { get: () => undefined } };
const {
  processChatPush,
} = require("../supabase/functions/_shared/pushWorker.ts");
function store(devices) {
  const tables = {
    chat_push_jobs: [
      {
        id: "j",
        family_id: "f",
        sender_id: "a",
        message_id: "m",
        kind: "message",
        attempts: 0,
        state: "pending",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ],
    chat_push_deliveries: [],
    family_members: [
      { user_id: "a", family_id: "f" },
      { user_id: "b", family_id: "f" },
    ],
    family_messages: [
      { id: "m", family_id: "f", body: "Hello", created_by_name: "A" },
    ],
    push_tokens: devices.map((id) => ({
      id,
      user_id: "b",
      family_id: "f",
      enabled: true,
      expo_push_token: id,
    })),
  };
  const admin = {
    rpc: async () => {
      const data = tables.chat_push_jobs
        .filter((j) => j.state === "pending")
        .map((j) => {
          j.state = "processing";
          j.lease_id = "lease";
          j.attempts++;
          return { ...j };
        });
      return { data, error: null };
    },
    from: (table) => {
      let filters = [],
        op = "select",
        values,
        single = false;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((row) => row[k] === v);
          return q;
        },
        lt(k, v) {
          filters.push((row) => row[k] < v);
          return q;
        },
        in(k, v) {
          filters.push((row) => v.includes(row[k]));
          return q;
        },
        limit() {
          return q;
        },
        single() {
          single = true;
          return q;
        },
        update(v) {
          op = "update";
          values = v;
          return q;
        },
        upsert(v) {
          op = "upsert";
          values = v;
          return q;
        },
        then(ok, bad) {
          return Promise.resolve()
            .then(() => {
              const rows = tables[table].filter((row) =>
                filters.every((f) => f(row)),
              );
              if (op === "update")
                rows.forEach((r) => Object.assign(r, values));
              if (op === "upsert") {
                const row = tables[table].find(
                  (r) =>
                    r.job_id === values.job_id &&
                    r.token_id === values.token_id,
                );
                if (row) Object.assign(row, values);
                else tables[table].push({ ...values });
              }
              return { data: single ? rows[0] : rows, error: null };
            })
            .then(ok, bad);
        },
      };
      return q;
    },
  };
  return { tables, admin };
}
test("no recipient stays pending, never reports submitted", async () => {
  const { tables, admin } = store([]);
  global.fetch = () => {
    throw Error("must not send");
  };
  const result = await processChatPush(admin);
  assert.equal(result.submitted, 0);
  assert.equal(tables.chat_push_jobs[0].state, "pending");
  assert.equal(tables.chat_push_jobs[0].last_error, "NoRecipientToken");
});
test("partial network failure preserves accepted token and retries only the unsent device", async () => {
  const { tables, admin } = store(["token1", "token2"]);
  let calls = [];
  global.fetch = async (url, opts) => {
    const token = JSON.parse(opts.body)[0].to;
    calls.push(token);
    return token === "token2"
      ? new Response("{}", { status: 503 })
      : Response.json({ data: [{ status: "ok", id: "ticket1" }] });
  };
  await processChatPush(admin);
  assert.equal(tables.chat_push_jobs[0].state, "pending");
  assert.equal(tables.chat_push_deliveries.length, 1);
  global.fetch = async (url, opts) => {
    calls.push(JSON.parse(opts.body)[0].to);
    return Response.json({ data: [{ status: "ok", id: "ticket2" }] });
  };
  await processChatPush(admin);
  assert.deepEqual(calls, ["token1", "token2", "token2"]);
  assert.equal(tables.chat_push_jobs[0].state, "submitted");
});
test("DeviceNotRegistered disables the device and marks the job failed", async () => {
  const { tables, admin } = store(["bad"]);
  global.fetch = async () =>
    Response.json({
      data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
    });
  await processChatPush(admin);
  assert.equal(tables.push_tokens[0].enabled, false);
  assert.equal(tables.chat_push_jobs[0].state, "failed");
});

function pendingReceipt(tables) {
  tables.chat_push_deliveries.push({
    job_id: "j", token_id: "token1", state: "ticket", ticket_id: "ticket1",
    submitted_at: new Date(Date.now() - 16 * 60000).toISOString(),
    chat_push_jobs: tables.chat_push_jobs[0],
  });
}
test("provider receipt confirms handoff, not device delivery", async () => {
  const { tables, admin } = store(["token1"]);
  tables.chat_push_jobs[0].state = "submitted";
  pendingReceipt(tables);
  global.fetch = async (url) => {
    assert.ok(url.endsWith("/getReceipts"));
    return Response.json({ data: { ticket1: { status: "ok" } } });
  };
  const result = await processChatPush(admin);
  assert.equal(result.processed, 0);
  assert.equal(tables.chat_push_deliveries[0].state, "provider_accepted");
});
test("receipt outage does not block fresh messages", async () => {
  const { tables, admin } = store(["token1", "token2"]);
  pendingReceipt(tables);
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push(url.split("/").pop());
    if (url.endsWith("/getReceipts")) throw Error("network unavailable");
    assert.equal(JSON.parse(opts.body)[0].to, "token2");
    return Response.json({ data: [{ status: "ok", id: "ticket2" }] });
  };
  const result = await processChatPush(admin);
  assert.equal(result.receipt_check_failed, true);
  assert.equal(result.submitted, 1);
  assert.deepEqual(calls, ["getReceipts", "send"]);
});
test("former family member cannot trigger a queued message notification", async () => {
  const { tables, admin } = store(["token1"]);
  tables.family_members = tables.family_members.filter(m => m.user_id !== "a");
  global.fetch = () => { throw Error("must not send"); };
  await processChatPush(admin);
  assert.equal(tables.chat_push_jobs[0].state, "failed");
  assert.equal(tables.chat_push_jobs[0].last_error, "SenderLeftFamily");
});
