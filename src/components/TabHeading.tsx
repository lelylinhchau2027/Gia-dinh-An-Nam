import { router, useIsFocused } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text } from "react-native";

export function TabHeading({ title }: { title: string }) {
  const focused = useIsFocused();
  return (
    <LinearGradient
      colors={["#7771BC", "#9875CD"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: "row",
        minHeight: 54,
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
      }}
    >
      {focused ? <StatusBar style="light" /> : null}
      <Pressable
        accessibilityLabel="Cài đặt"
        onPress={() => router.push("/cai-dat")}
        style={{
          width: 44,
          height: 44,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="menu-outline" size={26} color="#fff" />
      </Pressable>
      <Text
        style={{ fontFamily: "QuicksandSemiBold", fontSize: 20, color: "#fff" }}
      >
        {title}
      </Text>
      <Pressable
        accessibilityLabel="Việc chung và lời nhắn"
        onPress={() => router.push("/gia-dinh")}
        style={{
          width: 44,
          height: 44,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
      </Pressable>
    </LinearGradient>
  );
}
