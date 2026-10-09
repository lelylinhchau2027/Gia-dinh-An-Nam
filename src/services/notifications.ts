import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function prepareNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("family-reminders", {
      name: "Nhắc việc gia đình",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: "#D96C5F",
    });
  }
  await Notifications.setNotificationCategoryAsync("FAMILY_REMINDER", [
    {
      identifier: "DONE",
      buttonTitle: "Đã xong",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "OPEN",
      buttonTitle: "Mở ứng dụng",
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (notificationAllowed(current)) return true;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return notificationAllowed(next);
}

export function notificationAllowed(
  value: Notifications.NotificationPermissionsStatus,
) {
  return (
    value.granted ||
    value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function testLocalNotification() {
  await prepareNotifications();
  if (!(await requestNotificationPermission()))
    throw new Error("Hãy bật thông báo cho app trong Cài đặt iPhone.");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Gia Đình An Nam",
      body: "Nhắc cục bộ hoạt động trên máy này. Đây không phải push từ điện thoại còn lại.",
      sound: "default",
      data: { route: "/cai-dat", localTest: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 10000),
    },
  });
  return "Đã đặt thông báo thử sau 10 giây. Bạn có thể về màn hình chính để kiểm tra. Không cần aps-environment.";
}

export async function scheduleLocalReminder(input: {
  title: string;
  body?: string | null;
  dueAt: Date;
  reminderId?: string;
  signature?: string;
}): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted || input.dueAt.getTime() <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body || "Việc chung của gia đình đang đến hạn.",
      sound: "default",
      categoryIdentifier: "FAMILY_REMINDER",
      data: {
        route: "/gia-dinh",
        reminderId: input.reminderId,
        signature: input.signature,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.dueAt,
      channelId: Platform.OS === "android" ? "family-reminders" : undefined,
    },
  });
}

export async function cancelLocalReminder(id: string | null): Promise<void> {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}

export async function getRemotePushToken(): Promise<{
  token: string | null;
  reason: string | null;
}> {
  if (!Device.isDevice) {
    return { token: null, reason: "Cần chạy trên iPhone thật." };
  }
  const granted = await requestNotificationPermission();
  if (!granted) {
    return { token: null, reason: "Người dùng chưa cho phép thông báo." };
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    return {
      token: null,
      reason: "Chưa liên kết EAS projectId; thông báo cục bộ vẫn hoạt động.",
    };
  }
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: result.data, reason: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      token: null,
      reason: /aps-environment|entitlement/i.test(message)
        ? "Bản cài trên máy thiếu quyền push aps-environment hợp lệ. Nhắc cục bộ vẫn dùng được; push giữa hai máy cần App ID, provisioning profile và cấu hình APNs đúng. Cài bằng TrollStore/ESign không tự cấp quyền APNs."
        : `Chưa đăng ký được push: ${message}. Bạn vẫn có thể thử nhắc cục bộ.`,
    };
  }
}

const reconciliation = new WeakMap<SQLiteDatabase, Promise<void>>();
export async function reconcileSyncedReminders(
  db: SQLiteDatabase,
): Promise<void> {
  const previous = reconciliation.get(db) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => reconcileReminders(db));
  reconciliation.set(db, next);
  try {
    await next;
  } finally {
    if (reconciliation.get(db) === next) reconciliation.delete(db);
  }
}

async function reconcileReminders(db: SQLiteDatabase): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (!notificationAllowed(permission)) return;
  const reminders = await db.getAllAsync<{
    id: string;
    title: string;
    details: string | null;
    due_at: string;
  }>(
    "SELECT id, title, details, due_at FROM reminders WHERE completed_at IS NULL AND due_at > ? ORDER BY due_at LIMIT 48",
    new Date().toISOString(),
  );
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const signature = (r: (typeof reminders)[number]) =>
    JSON.stringify([r.title, r.details, r.due_at]);
  const valid = new Map<string, string>();
  for (const request of scheduled) {
    const data = request.content.data;
    if (data?.route !== "/gia-dinh") continue;
    const reminder = reminders.find((r) => r.id === data.reminderId);
    if (
      !reminder ||
      data.signature !== signature(reminder) ||
      valid.has(reminder.id)
    ) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    } else valid.set(reminder.id, request.identifier);
  }
  await db.runAsync("UPDATE reminders SET local_notification_id = NULL");
  for (const reminder of reminders) {
    const id =
      valid.get(reminder.id) ??
      (await scheduleLocalReminder({
        title: reminder.title,
        body: reminder.details,
        dueAt: new Date(reminder.due_at),
        reminderId: reminder.id,
        signature: signature(reminder),
      }));
    if (id)
      await db.runAsync(
        "UPDATE reminders SET local_notification_id=? WHERE id=?",
        id,
        reminder.id,
      );
  }
}
