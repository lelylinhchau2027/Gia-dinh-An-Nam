import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const icons = {
  index: ["newspaper", "newspaper-outline"],
  "em-be": ["happy", "happy-outline"],
  "theo-doi": ["pulse", "pulse-outline"],
  lich: ["book", "book-outline"],
  "gia-dinh": ["people", "people-outline"],
  "cai-dat": ["settings", "settings-outline"],
} as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          height: 64 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontFamily: "QuicksandSemiBold", fontSize: 12 },
        tabBarIcon: ({ color, focused, size }) => {
          const pair = icons[route.name as keyof typeof icons] ?? icons.index;
          return (
            <Ionicons
              name={focused ? pair[0] : pair[1]}
              color={color}
              size={size}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Bảng tin" }} />
      <Tabs.Screen name="em-be" options={{ title: "Em bé" }} />
      <Tabs.Screen name="lich" options={{ title: "Cẩm nang" }} />
      <Tabs.Screen name="theo-doi" options={{ href: null }} />
      <Tabs.Screen name="gia-dinh" options={{ href: null }} />
      <Tabs.Screen name="cai-dat" options={{ href: null }} />
    </Tabs>
  );
}
