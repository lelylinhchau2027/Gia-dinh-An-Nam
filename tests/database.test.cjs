const { test } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
};
const {
  migrateDatabase,
  loadSnapshot,
  insertCareEntry,
  insertCareEntries,
  getPendingOutbox,
  acknowledgeOutbox,
  mergeRemoteSnapshot,
  attachRemoteFamily,
} = require("../src/lib/database.ts");
const { editCare, saveChild, parseDay } = require("../src/lib/childRecords.ts");
const { readCareHistory, summarizeCare } = require("../src/lib/careHistory.ts");
function database() {
  const raw = new DatabaseSync(":memory:");
  return {
    raw,
    execAsync: async (sql) => raw.exec(sql),
    runAsync: async (sql, ...args) => raw.prepare(sql).run(...args),
    getFirstAsync: async (sql, ...args) =>
      raw.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, ...args) => raw.prepare(sql).all(...args),
    withTransactionAsync: async (cb) => {
      raw.exec("BEGIN");
      try {
        await cb();
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
test("0.1 schema upgrades without losing records; second startup is idempotent", async () => {
  const db = database();
  const v1Schema = fs
    .readFileSync("src/lib/database.ts", "utf8")
    .match(/await db\.execAsync\(`([\s\S]*?)`\)/)[1];
  db.raw.exec(v1Schema);
  db.raw.exec(
    "INSERT INTO families VALUES ('v1-family','Nhà mình','ABCDEFGH','2026-01-01'); INSERT INTO children(id,family_id,name,updated_at) VALUES ('v1-baby','v1-family','An Nam','2026-01-01'); INSERT INTO care_entries(id,family_id,child_id,kind,amount,unit,occurred_at,created_by,created_by_name,updated_at) VALUES ('v1-care','v1-family','v1-baby','milk',90,'ml','2026-01-01','local_parent_1','Ba','2026-01-01');",
  );
  await migrateDatabase(db);
  const old = await loadSnapshot(db);
  await insertCareEntry(db, {
    familyId: old.family.id,
    childId: old.child.id,
    kind: "milk",
    amount: 120,
    unit: "ml",
    details: { feeding: "Bú bình" },
  });
  await migrateDatabase(db);
  const snapshot = await loadSnapshot(db);
  assert.equal(snapshot.entries.length, 2);
  assert.equal(snapshot.entries[0].amount, 120);
  assert.equal(snapshot.entries.find((e) => e.id === "v1-care").amount, 90);
  assert.equal(snapshot.entries[0].details.feeding, "Bú bình");
  db.raw.close();
});
test("queued edit stays pending when earlier write is acknowledged; remote cannot overwrite it", async () => {
  const db = database();
  await migrateDatabase(db);
  const { child, family } = await loadSnapshot(db);
  await insertCareEntry(db, {
    familyId: family.id,
    childId: child.id,
    kind: "milk",
    amount: 100,
    unit: "ml",
  });
  const entry = (await loadSnapshot(db)).entries[0];
  await editCare(db, entry, {
    amount: 150,
    unit: "ml",
    note: "Sửa",
    occurred_at: entry.occurred_at,
    details: {},
  });
  const queue = await getPendingOutbox(db);
  await acknowledgeOutbox(db, queue[0]);
  assert.equal((await loadSnapshot(db)).entries[0].sync_state, "pending");
  await mergeRemoteSnapshot(db, {
    children: [],
    careEntries: [{ ...entry, amount: 100 }],
    messages: [],
    reminders: [],
  });
  assert.equal((await loadSnapshot(db)).entries[0].amount, 150);
  await acknowledgeOutbox(db, queue[1]);
  assert.equal((await loadSnapshot(db)).entries[0].sync_state, "synced");
  db.raw.close();
});
test("soft deleted care record disappears and propagates through remote merge", async () => {
  const db = database();
  await migrateDatabase(db);
  const { child, family } = await loadSnapshot(db);
  await insertCareEntry(db, {
    familyId: family.id,
    childId: child.id,
    kind: "sleep",
    amount: 30,
  });
  const entry = (await loadSnapshot(db)).entries[0];
  for (const row of await getPendingOutbox(db))
    await acknowledgeOutbox(db, row);
  await mergeRemoteSnapshot(db, {
    children: [],
    careEntries: [{ ...entry, deleted_at: new Date().toISOString() }],
    messages: [],
    reminders: [],
  });
  assert.equal((await loadSnapshot(db)).entries.length, 0);
  db.raw.close();
});
test("child photos persist across pairing and are included in outbound child payload", async () => {
  const db = database();
  await migrateDatabase(db);
  const { child } = await loadSnapshot(db);
  await saveChild(db, {
    ...child,
    name: "An Nam",
    birthday: "2026-01-01",
    avatar_path: "family/user/a.jpg",
    cover_path: "family/user/c.jpg",
  });
  await attachRemoteFamily(db, {
    id: "remote-family",
    name: "Nhà mình",
    inviteCode: "12345678",
    userId: "real-user",
    displayName: "Ba",
    preserveLocalData: true,
  });
  const result = await loadSnapshot(db);
  assert.equal(result.child.avatar_path, "family/user/a.jpg");
  assert.equal(result.child.family_id, "remote-family");
  const queued = (await getPendingOutbox(db)).find(
    (r) => r.entity_type === "children",
  );
  assert.equal(JSON.parse(queued.payload).cover_path, "family/user/c.jpg");
  db.raw.close();
});
test("date validation rejects rollover and accepts leap dates", () => {
  assert.throws(() => parseDay("2026-02-30"));
  assert.throws(() => parseDay("2026-13-01"));
  assert.equal(parseDay("2024-02-29"), "2024-02-29");
  assert.equal(parseDay(""), null);
});

test("multi-metric measurement is atomic, including its sync queue", async () => {
  const db = database();
  await migrateDatabase(db);
  const { family, child } = await loadSnapshot(db);
  const base = {
    familyId: family.id,
    childId: child.id,
    kind: "growth",
    occurredAt: new Date().toISOString(),
  };
  await insertCareEntries(db, [
    { ...base, amount: 8, unit: "kg", details: { metric: "Cân nặng" } },
    {
      ...base,
      amount: 70,
      unit: "cm",
      details: { metric: "Chiều dài / chiều cao" },
    },
    { ...base, amount: 44, unit: "cm", details: { metric: "Vòng đầu" } },
  ]);
  assert.equal((await readCareHistory(db, child.id)).length, 3);
  const before = (await getPendingOutbox(db)).length;
  const run = db.runAsync;
  let inserts = 0;
  db.runAsync = async (sql, ...args) => {
    if (sql.includes("INSERT INTO care_entries") && ++inserts === 2)
      throw new Error("simulated storage failure");
    return run(sql, ...args);
  };
  await assert.rejects(
    insertCareEntries(db, [
      { ...base, amount: 9 },
      { ...base, amount: 71 },
    ]),
    /simulated/,
  );
  assert.equal((await readCareHistory(db, child.id)).length, 3);
  assert.equal((await getPendingOutbox(db)).length, before);
  db.raw.close();
});

test("assistant history retains tool details, excludes deleted records, and separates pumped from consumed milk", async () => {
  const db = database();
  await migrateDatabase(db);
  const { child, family } = await loadSnapshot(db);
  for (const input of [
    { kind: "milk", amount: 120, unit: "ml", details: { tool: "milk" } },
    {
      kind: "milk",
      amount: 90,
      unit: "ml",
      details: { tool: "pump", feeding: "Hút sữa" },
    },
    { kind: "milk", amount: 60, unit: "ml", details: { feeding: "Hút sữa" } },
    {
      kind: "milk",
      amount: 15,
      unit: "phút",
      details: { feeding: "Bú mẹ bên trái" },
    },
    { kind: "activity", details: { tool: "teeth", tooth: "Trên · Trái 1" } },
    {
      kind: "activity",
      amount: 4,
      unit: "lần",
      details: { tool: "kick", sessionId: "draft-1" },
    },
  ])
    await insertCareEntry(db, {
      familyId: family.id,
      childId: child.id,
      ...input,
    });
  const history = await readCareHistory(db, child.id);
  assert.equal(history.length, 6);
  assert.equal(summarizeCare(history).milk, 120);
  assert.equal(summarizeCare(history).pumped, 150);
  const tooth = history.find((e) => e.details?.tool === "teeth");
  assert.equal(tooth.details.tooth, "Trên · Trái 1");
  await editCare(db, tooth, { deleted_at: new Date().toISOString() });
  assert.equal((await readCareHistory(db, child.id)).length, 5);
  assert.equal(
    db.raw
      .prepare(
        "SELECT count(*) AS n FROM care_entries WHERE json_extract(details, '$.sessionId') = ?",
      )
      .get("draft-1").n,
    1,
  );
  const queued = await getPendingOutbox(db);
  assert.ok(queued.some((q) => JSON.parse(q.payload).details?.tool === "kick"));
  db.raw.close();
});
