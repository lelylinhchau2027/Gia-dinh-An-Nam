import { router, Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/ui";
import { easyTemplates } from "../../src/data/reference";
import { useCareHistory } from "../../src/lib/useCareHistory";

export default function EasyListScreen() {
  const { entries, child } = useCareHistory();
  const plan = entries.find((e) => e.details?.tool === "easy_plan");
  const current = easyTemplates.find((t) => t.id === plan?.details?.templateId);
  const open = (id: string) =>
    router.push({ pathname: "/easy/[id]", params: { id } });
  return (
    <Screen contentStyle={{ paddingHorizontal: 0, gap: 0 }}>
      <Stack.Screen options={{ title: "Lịch E.A.S.Y." }} />
      <Text style={s.heading}>
        Lịch của {child?.nickname || child?.name || "bé"}
      </Text>
      {current ? (
        <Pressable style={s.row} onPress={() => open(current.id)}>
          <Ionicons name="sunny-outline" size={27} color="#8E70CA" />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>E.A.S.Y {current.name}</Text>
            <Text style={s.body}>Giờ bắt đầu: {plan?.details?.wakeTime}</Text>
          </View>
          <Ionicons name="chevron-forward" color="#8E70CA" size={20} />
        </Pressable>
      ) : (
        <Text style={s.empty}>
          Chưa chọn lịch riêng. Chọn một mẫu bên dưới để xem và điều chỉnh giờ
          bắt đầu.
        </Text>
      )}
      <Text style={s.heading}>Các lịch phổ biến</Text>
      {easyTemplates.map((template) => (
        <Pressable
          key={template.id}
          style={s.row}
          onPress={() => open(template.id)}
        >
          <View style={s.badge}>
            <Text style={s.badgeText}>{template.name}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>E.A.S.Y {template.name}</Text>
            <Text style={s.body}>
              Tuần {template.fromWeek}–{template.toWeek ?? "trở đi"} · Dữ liệu
              gốc
            </Text>
          </View>
          <Ionicons name="chevron-forward" color="#AAA" size={20} />
        </Pressable>
      ))}
      <Text style={s.empty}>
        Mẫu tham khảo từ app gốc, chưa phải khuyến nghị đã cập nhật. Điều chỉnh
        theo nhu cầu của bé và hướng dẫn của người theo dõi sức khỏe.
      </Text>
    </Screen>
  );
}
const s = StyleSheet.create({
  heading: {
    padding: 20,
    paddingTop: 24,
    backgroundColor: "#F4F5F7",
    fontFamily: "QuicksandSemiBold",
    fontSize: 18,
    color: "#303B46",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 82,
    padding: 18,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  title: { fontFamily: "QuicksandSemiBold", fontSize: 18, color: "#303B46" },
  body: {
    fontFamily: "Quicksand",
    fontSize: 13,
    color: "#858A91",
    marginTop: 6,
  },
  empty: {
    fontFamily: "Quicksand",
    fontSize: 14,
    lineHeight: 22,
    color: "#858A91",
    padding: 20,
  },
  badge: {
    width: 58,
    minHeight: 54,
    backgroundColor: "#E9E2F5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: "QuicksandBold", color: "#8E70CA", fontSize: 20 },
});
