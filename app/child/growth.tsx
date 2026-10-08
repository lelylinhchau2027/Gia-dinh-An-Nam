import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Screen, Card } from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
import { formStyles as s } from "../../src/components/forms";
import { colors } from "../../src/theme";

type Point = {
  id: string;
  amount: number;
  unit: string;
  occurred_at: string;
  details: string;
};
export default function GrowthScreen() {
  const db = useSQLiteContext();
  const { child } = useApp();
  const [points, setPoints] = useState<Point[]>([]);
  const [metric, setMetric] = useState("Cân nặng");
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      if (child)
        db.getAllAsync<Point>(
          "SELECT id,amount,unit,occurred_at,details FROM care_entries WHERE child_id=? AND kind='growth' AND deleted_at IS NULL AND amount IS NOT NULL ORDER BY occurred_at DESC LIMIT 365",
          child.id,
        )
          .then(setPoints)
          .catch(() => setError("Chưa tải được số đo."));
    }, [db, child?.id]),
  );
  const filtered = points
    .filter(
      (p) =>
        (JSON.parse(p.details).metric ??
          (p.unit === "kg" ? "Cân nặng" : "Chiều dài / chiều cao")) === metric,
    )
    .slice(0, 14)
    .reverse();
  const max = Math.max(1, ...filtered.map((p) => p.amount));
  return (
    <Screen>
      <Text style={s.title}>Tăng trưởng của {child?.name}</Text>
      <View style={s.wrap}>
        {["Cân nặng", "Chiều dài / chiều cao", "Vòng đầu"].map((m) => (
          <Pressable
            key={m}
            style={[s.chip, metric === m && s.activeChip]}
            onPress={() => setMetric(m)}
          >
            <Text>{m}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.hint}>
        14 số đo gần nhất · Trục cột bắt đầu từ 0. Đây là lịch sử số đo, chưa
        phải biểu đồ bách phân vị.
      </Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Card>
        <ScrollView horizontal>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 14,
              height: 240,
            }}
          >
            {filtered.map((p) => (
              <View
                key={p.id}
                style={{ width: 72, alignItems: "center", gap: 8 }}
              >
                <Text style={s.label}>
                  {p.amount} {p.unit}
                </Text>
                <View
                  accessibilityLabel={`${new Date(p.occurred_at).toLocaleDateString("vi-VN")}: ${p.amount} ${p.unit}`}
                  style={{
                    height: Math.max(2, (p.amount / max) * 160),
                    width: 36,
                    backgroundColor: colors.sage,
                    borderRadius: 8,
                  }}
                />
                <Text style={s.hint}>
                  {new Date(p.occurred_at).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        {!filtered.length ? (
          <Text style={s.body}>Thêm số đo từ tab Em bé → Tăng trưởng.</Text>
        ) : null}
      </Card>
    </Screen>
  );
}
