import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, PrimaryButton } from "../../src/components/ui";
import { TimePicker } from "../../src/components/TimePicker";
import { AssistantIcon } from "../../src/components/AssistantIcon";
import { easyTemplates, easyTypeLabels } from "../../src/data/reference";
import { findAssistantTool } from "../../src/data/assistant";
import { useApp } from "../../src/providers/AppProvider";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { parseWakeTime, shiftedEasyTime } from "../../src/lib/easySchedule";

export default function EasyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = easyTemplates.find((item) => item.id === id);
  const { entries } = useCareHistory();
  const { addCare, child } = useApp();
  const plan = entries.find(
    (e) => e.details?.tool === "easy_plan" && e.details.templateId === id,
  );
  const base = Math.min(
    ...(template?.easyTimeGroups.flatMap((g) =>
      g.easyTimes.map((t) => t.from),
    ) ?? [7]),
  );
  const [wake, setWake] = useState("07:00");
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    setSaved(false);
  }, [id]);
  useEffect(() => {
    setWake(plan?.details?.wakeTime || shiftedEasyTime(base, 0));
  }, [plan?.id, id, base]);
  let offset = 0;
  let timeError = "";
  try {
    offset = parseWakeTime(wake) - Math.round(base * 60);
  } catch (e) {
    timeError = (e as Error).message;
  }
  if (!template)
    return (
      <Screen>
        <Text>Không tìm thấy mẫu E.A.S.Y.</Text>
      </Screen>
    );
  const save = async () => {
    if (lock.current || timeError) return;
    lock.current = true;
    setSaving(true);
    try {
      await addCare({
        kind: "activity",
        note: `Chọn lịch E.A.S.Y ${template.name}, bắt đầu ${wake}`,
        details: { tool: "easy_plan", templateId: template.id, wakeTime: wake },
      });
      setSaved(true);
      Alert.alert(
        "Đã lưu lịch của bé",
        "Giờ bắt đầu và mẫu lịch sẽ đồng bộ cùng nhật ký gia đình. Đây chưa phải lịch nhắc tự động.",
      );
    } catch {
      Alert.alert("Chưa lưu được", "Hãy thử lại.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <Screen contentStyle={s.content}>
      <Stack.Screen options={{ title: `E.A.S.Y ${template.name}` }} />
      <View style={s.child}>
        <Text style={s.title}>
          {child?.nickname || child?.name || "Bé yêu"}
        </Text>
        <Text style={s.muted}>
          Mẫu từ dữ liệu gốc · Tuần {template.fromWeek}–
          {template.toWeek ?? "trở đi"}
        </Text>
      </View>
      <View style={s.wake}>
        <Ionicons name="sunny-outline" color="#E9BB64" size={28} />
        <Text style={s.label}>Giờ bắt đầu ngày</Text>
        <TimePicker
          label="Giờ bắt đầu E.A.S.Y"
          value={wake}
          onChange={(value) => {
            setWake(value);
            setSaved(false);
          }}
        />
      </View>
      {timeError ? (
        <Text accessibilityRole="alert" style={s.error}>
          {timeError}
        </Text>
      ) : null}
      <Text style={s.notice}>
        Tham khảo, không phải chỉ định ăn/ngủ. Giờ hiển thị được dịch theo giờ
        bắt đầu bạn chọn; không tự tạo thông báo.
      </Text>
      {template.easyTimeGroups.map((group, gi) => (
        <View key={gi}>
          <Text style={s.cycle}>Chu kỳ {gi + 1}</Text>
          {group.easyTimes.map((slot, si) => (
            <View key={si} style={s.slot}>
              <View style={s.timeColumn}>
                <Text style={s.time}>{shiftedEasyTime(slot.from, offset)}</Text>
                {slot.to !== null ? (
                  <Text style={s.timeTo}>
                    {shiftedEasyTime(slot.to, offset)}
                  </Text>
                ) : null}
              </View>
              <View style={s.line} />
              <View style={s.slotContent}>
                <View style={s.types}>
                  {slot.types.map((type) => {
                    const tool = findAssistantTool(
                      type === "E"
                        ? "milk"
                        : type === "S"
                          ? "sleep"
                          : "activity",
                    )!;
                    return (
                      <View key={type} style={s.type}>
                        <AssistantIcon tool={tool} size={32} />
                        <Text style={s.label}>{easyTypeLabels[type]}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={s.notes}>{slot.notes}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
      <View style={s.footer}>
        {saved ? (
          <Text accessibilityRole="alert" style={s.link}>
            Đã lưu lịch cho bé
          </Text>
        ) : null}
        <PrimaryButton
          disabled={saving || !!timeError || !child}
          title={saving ? "Đang lưu…" : "Dùng lịch này cho bé"}
          onPress={save}
        />
        <Pressable
          style={s.notesButton}
          onPress={() => setShowNotes((v) => !v)}
        >
          <Text style={s.link}>
            {showNotes ? "Ẩn" : "Xem"} điều kiện và ghi chú gốc
          </Text>
        </Pressable>
        {showNotes ? (
          <>
            <Text style={s.notes}>{template.conditions}</Text>
            <Text style={s.notes}>{template.notes}</Text>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 0, gap: 0 },
  child: { padding: 20, gap: 5, borderBottomWidth: 1, borderColor: "#EEE" },
  title: { fontFamily: "QuicksandSemiBold", fontSize: 20, color: "#303B46" },
  muted: { fontFamily: "Quicksand", fontSize: 13, color: "#858A91" },
  wake: { padding: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontFamily: "QuicksandSemiBold", color: "#303B46", fontSize: 15 },
  timeInput: {
    marginLeft: "auto",
    width: 84,
    textAlign: "center",
    minHeight: 48,
    borderBottomWidth: 1,
    borderColor: "#8E70CA",
    fontFamily: "QuicksandSemiBold",
    fontSize: 20,
    color: "#8E70CA",
  },
  error: { paddingHorizontal: 20, color: "#B94242", fontSize: 14 },
  notice: {
    padding: 18,
    paddingTop: 0,
    color: "#858A91",
    fontFamily: "Quicksand",
    fontSize: 13,
    lineHeight: 20,
  },
  cycle: {
    padding: 12,
    paddingLeft: 20,
    backgroundColor: "#F1F2F5",
    fontFamily: "QuicksandSemiBold",
    fontSize: 16,
    color: "#8E70CA",
  },
  slot: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  timeColumn: { width: 64 },
  time: { fontFamily: "QuicksandSemiBold", fontSize: 16, color: "#303B46" },
  timeTo: {
    fontFamily: "Quicksand",
    fontSize: 13,
    color: "#858A91",
    marginTop: 5,
  },
  line: { width: 2, backgroundColor: "#E9E2F5" },
  slotContent: { flex: 1, gap: 8 },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: { flexDirection: "row", alignItems: "center", gap: 6 },
  notes: {
    fontFamily: "Quicksand",
    fontSize: 14,
    lineHeight: 23,
    color: "#626C76",
  },
  footer: { padding: 20, gap: 16 },
  notesButton: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  link: { fontFamily: "QuicksandSemiBold", fontSize: 15, color: "#8E70CA" },
});
