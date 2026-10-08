import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../src/providers/AppProvider";
import { migrateDatabase } from "../src/lib/database";
import { colors } from "../src/theme";

function NotificationNavigation() {
  const { reminders, completeReminder, loading } = useApp();
  const state = useRef({ reminders, completeReminder });
  state.current = { reminders, completeReminder };
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handled.current === key) return;
      handled.current = key;
      const reminder = state.current.reminders.find(
        (r) => r.id === response.notification.request.content.data?.reminderId,
      );
      if (response.actionIdentifier === "DONE" && reminder)
        void state.current.completeReminder(reminder).catch(() => undefined);
      const route = response.notification.request.content.data?.route;
      if (
        typeof route === "string" &&
        ["/", "/gia-dinh", "/theo-doi", "/em-be"].includes(route)
      ) {
        router.push(route as never);
      }
      void Notifications.clearLastNotificationResponseAsync();
    };
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(handle);
    return () => subscription.remove();
  }, [loading]);
  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="gia-dinh-an-nam.db" onInit={migrateDatabase}>
      <AppProvider>
        <NotificationNavigation />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: "800" },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="record/new"
            options={{ title: "Ghi nhanh", presentation: "modal" }}
          />
          <Stack.Screen
            name="family/message"
            options={{ title: "Nhắn cho người nhà", presentation: "modal" }}
          />
          <Stack.Screen
            name="family/connect"
            options={{ title: "Ghép hai thiết bị", presentation: "modal" }}
          />
          <Stack.Screen
            name="reminder/new"
            options={{ title: "Tạo nhắc việc", presentation: "modal" }}
          />
          <Stack.Screen
            name="vaccine/[id]"
            options={{ title: "Chi tiết lịch tiêm" }}
          />
          <Stack.Screen name="easy/[id]" options={{ title: "Lịch E.A.S.Y" }} />
          <Stack.Screen name="account" options={{ title: "Tài khoản" }} />
          <Stack.Screen name="child/edit" options={{ title: "Hồ sơ bé" }} />
          <Stack.Screen
            name="child/growth"
            options={{ title: "Tăng trưởng" }}
          />
          <Stack.Screen name="handbook/[id]" options={{ title: "Cẩm nang" }} />
        </Stack>
      </AppProvider>
    </SQLiteProvider>
  );
}
