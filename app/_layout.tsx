import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../src/providers/AppProvider';
import { migrateDatabase } from '../src/lib/database';
import { colors } from '../src/theme';

export default function RootLayout() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        router.push(route as never);
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <SQLiteProvider databaseName="gia-dinh-an-nam.db" onInit={migrateDatabase}>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="record/new" options={{ title: 'Ghi nhanh', presentation: 'modal' }} />
          <Stack.Screen name="family/message" options={{ title: 'Nhắn cho người nhà', presentation: 'modal' }} />
          <Stack.Screen name="family/connect" options={{ title: 'Ghép hai thiết bị', presentation: 'modal' }} />
          <Stack.Screen name="reminder/new" options={{ title: 'Tạo nhắc việc', presentation: 'modal' }} />
          <Stack.Screen name="vaccine/[id]" options={{ title: 'Chi tiết lịch tiêm' }} />
          <Stack.Screen name="easy/[id]" options={{ title: 'Lịch E.A.S.Y' }} />
        </Stack>
      </AppProvider>
    </SQLiteProvider>
  );
}
