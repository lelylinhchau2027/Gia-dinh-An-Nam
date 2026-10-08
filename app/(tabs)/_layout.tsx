import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../src/theme';

const icons = {
  index: ['home', 'home-outline'],
  'theo-doi': ['pulse', 'pulse-outline'],
  lich: ['calendar', 'calendar-outline'],
  'gia-dinh': ['people', 'people-outline'],
  'cai-dat': ['settings', 'settings-outline'],
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarIcon: ({ color, focused, size }) => {
          const pair = icons[route.name as keyof typeof icons] ?? icons.index;
          return <Ionicons name={focused ? pair[0] : pair[1]} color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Tổng quan' }} />
      <Tabs.Screen name="theo-doi" options={{ title: 'Theo dõi' }} />
      <Tabs.Screen name="lich" options={{ title: 'Lịch' }} />
      <Tabs.Screen name="gia-dinh" options={{ title: 'Gia đình' }} />
      <Tabs.Screen name="cai-dat" options={{ title: 'Cài đặt' }} />
    </Tabs>
  );
}

