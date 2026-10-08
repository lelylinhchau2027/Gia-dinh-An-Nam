import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function prepareNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('family-reminders', {
      name: 'Nhắc việc gia đình',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: '#D96C5F',
    });
  }
  await Notifications.setNotificationCategoryAsync('FAMILY_REMINDER', [
    {
      identifier: 'DONE',
      buttonTitle: 'Đã xong',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'OPEN',
      buttonTitle: 'Mở ứng dụng',
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return next.granted;
}

export async function scheduleLocalReminder(input: {
  title: string;
  body?: string | null;
  dueAt: Date;
}): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted || input.dueAt.getTime() <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body || 'Việc chung của gia đình đang đến hạn.',
      sound: 'default',
      categoryIdentifier: 'FAMILY_REMINDER',
      data: { route: '/gia-dinh' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.dueAt,
      channelId: Platform.OS === 'android' ? 'family-reminders' : undefined,
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
    return { token: null, reason: 'Cần chạy trên iPhone thật.' };
  }
  const granted = await requestNotificationPermission();
  if (!granted) {
    return { token: null, reason: 'Người dùng chưa cho phép thông báo.' };
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    return {
      token: null,
      reason: 'Chưa liên kết EAS projectId; thông báo cục bộ vẫn hoạt động.',
    };
  }
  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: result.data, reason: null };
}

export async function reconcileSyncedReminders(db: SQLiteDatabase): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const completed = await db.getAllAsync<{
    id: string;
    local_notification_id: string;
  }>(
    `SELECT id, local_notification_id FROM reminders
     WHERE completed_at IS NOT NULL AND local_notification_id IS NOT NULL`,
  );
  for (const reminder of completed) {
    await cancelLocalReminder(reminder.local_notification_id).catch(() => undefined);
    await db.runAsync(
      'UPDATE reminders SET local_notification_id = NULL WHERE id = ?',
      reminder.id,
    );
  }

  const unscheduled = await db.getAllAsync<{
    id: string;
    title: string;
    details: string | null;
    due_at: string;
  }>(
    `SELECT id, title, details, due_at FROM reminders
     WHERE completed_at IS NULL
       AND local_notification_id IS NULL
       AND due_at > ?
     ORDER BY due_at ASC LIMIT 50`,
    new Date().toISOString(),
  );
  for (const reminder of unscheduled) {
    const notificationId = await scheduleLocalReminder({
      title: reminder.title,
      body: reminder.details,
      dueAt: new Date(reminder.due_at),
    });
    if (notificationId) {
      await db.runAsync(
        'UPDATE reminders SET local_notification_id = ? WHERE id = ?',
        notificationId,
        reminder.id,
      );
    }
  }
}
