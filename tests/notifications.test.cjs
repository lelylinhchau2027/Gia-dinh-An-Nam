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
  setNotificationCategoryAsync: async () => {},
  getExpoPushTokenAsync: async () => {
    throw new Error("no valid aps-environment entitlement string found");
  },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
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
  if (id === "expo-constants")
    return {
      __esModule: true,
      default: {
        expoConfig: { extra: { eas: { projectId: "test-project" } } },
      },
    };
  if (id === "react-native") return { Platform: { OS: "ios" } };
  return load.call(this, id, ...args);
};
const {
  reconcileSyncedReminders,
  getRemotePushToken,
  testLocalNotification,
  notificationAllowed,
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

test("missing APNs entitlement does not prevent local tests or reminder reconciliation", async () => {
  const push = await getRemotePushToken();
  assert.equal(push.token, null);
  assert.match(push.reason, /Nhắc cục bộ vẫn dùng được/);
  await testLocalNotification();
  const local = [...scheduled.values()].find((n) => n.content.data.localTest);
  assert.ok(local);
  assert.ok(local.trigger.date.getTime() > Date.now());
  await reconcileSyncedReminders(db);
  assert.ok(scheduled.has(local.identifier));
  assert.equal(
    notificationAllowed({ granted: false, ios: { status: 3 } }),
    true,
  );
});
