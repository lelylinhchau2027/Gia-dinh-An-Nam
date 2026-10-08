const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
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
const scheduled = new Map();
let sequence = 0;
let rows = [];
const notifications = {
  setNotificationHandler() {},
  getPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => Array.from(scheduled.values()),
  cancelScheduledNotificationAsync: async (id) => {
    scheduled.delete(id);
  },
  scheduleNotificationAsync: async (request) => {
    const identifier = `n${++sequence}`;
    scheduled.set(identifier, { identifier, ...request });
    return identifier;
  },
  SchedulableTriggerInputTypes: { DATE: "date" },
};
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === "expo-notifications") return notifications;
  if (id === "expo-device") return { isDevice: true };
  if (id === "expo-constants") return {};
  if (id === "react-native") return { Platform: { OS: "ios" } };
  return load.call(this, id, ...args);
};
const {
  reconcileSyncedReminders,
} = require("../src/services/notifications.ts");
const db = { getAllAsync: async () => rows, runAsync: async () => {} };
test("local reminders update changed times, cancel completed work and restore missing OS requests without duplicates", async () => {
  rows = [
    {
      id: "r1",
      title: "Lịch hẹn",
      details: null,
      due_at: new Date(Date.now() + 600000).toISOString(),
    },
  ];
  await reconcileSyncedReminders(db);
  assert.equal(scheduled.size, 1);
  const first = [...scheduled.keys()][0];
  await Promise.all([
    reconcileSyncedReminders(db),
    reconcileSyncedReminders(db),
  ]);
  assert.equal(scheduled.size, 1);
  assert.ok(scheduled.has(first));
  rows[0].due_at = new Date(Date.now() + 1200000).toISOString();
  await reconcileSyncedReminders(db);
  assert.equal(scheduled.size, 1);
  assert.ok(!scheduled.has(first));
  scheduled.clear();
  await reconcileSyncedReminders(db);
  assert.equal(scheduled.size, 1);
  rows = [];
  await reconcileSyncedReminders(db);
  assert.equal(scheduled.size, 0);
});
