import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { DayPicker, localDay } from "../../src/components/DayPicker";
import { Screen, PrimaryButton, LinkButton } from "../../src/components/ui";
import { formStyles as s } from "../../src/components/forms";
import { useApp } from "../../src/providers/AppProvider";
import { insertCareEntries } from "../../src/lib/database";
import { parseDay } from "../../src/lib/childRecords";

const metrics = [
  { id: "weight", label: "Cân nặng", unit: "kg" },
  { id: "height", label: "Chiều dài / chiều cao", unit: "cm" },
  { id: "head", label: "Vòng đầu", unit: "cm" },
];
export default function MeasureScreen() {
  const db = useSQLiteContext();
  const { child, family, refresh, syncNow } = useApp();
  const [values, setValues] = useState<Record<string, string>>({});
  const [day, setDay] = useState(localDay(new Date()));
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      if (!child || !family) throw new Error("Chưa có hồ sơ bé.");
      parseDay(day);
      if (day > localDay(new Date()))
        throw new Error("Ngày ghi nhận không được ở tương lai.");
      const selected = metrics.filter((m) => values[m.id]?.trim());
      if (!selected.length) throw new Error("Nhập ít nhất một số đo.");
      const occurredAt =
        day === localDay(new Date())
          ? new Date().toISOString()
          : new Date(`${day}T12:00:00`).toISOString();
      const rows = selected.map((m) => {
        const amount = Number(values[m.id]!.replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0)
          throw new Error(`${m.label} phải là số lớn hơn 0.`);
        return {
          familyId: family.id,
          childId: child.id,
          kind: "growth" as const,
          amount,
          unit: m.unit,
          occurredAt,
          details: { metric: m.label },
        };
      });
      await insertCareEntries(db, rows);
      await refresh();
      void syncNow();
      router.back();
    } catch (e) {
      Alert.alert(
        "Chưa lưu được",
        e instanceof Error ? e.message : "Hãy thử lại.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Thêm chỉ số cho bé" }} />
      <Text style={s.label}>Bé</Text>
      <Text style={[s.input, { fontFamily: "Quicksand" }]}>
        {child?.nickname || child?.name}
      </Text>
      {metrics.map((m) => (
        <View key={m.id} style={{ gap: 8 }}>
          <Text
            style={[
              s.label,
              { color: "#8E70CA", fontFamily: "QuicksandSemiBold" },
            ]}
          >
            {m.label}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              accessibilityLabel={m.label}
              keyboardType="decimal-pad"
              style={[s.input, { flex: 1, borderRadius: 8 }]}
              value={values[m.id] ?? ""}
              onChangeText={(value) =>
                setValues((v) => ({ ...v, [m.id]: value }))
              }
            />
            <Text
              style={{
                padding: 16,
                backgroundColor: "#F0F1F4",
                color: "#858A91",
              }}
            >
              {m.unit}
            </Text>
          </View>
        </View>
      ))}
      <Text style={s.label}>Ngày</Text>
      <DayPicker value={day} onChange={setDay} />
      <PrimaryButton
        title={saving ? "Đang lưu…" : "Thêm chỉ số"}
        onPress={save}
        disabled={saving}
      />
      <LinkButton
        title="Tất cả chỉ số & biểu đồ"
        onPress={() => router.push("/child/growth")}
      />
    </Screen>
  );
}
