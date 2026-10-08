import { useState } from "react";
import { Text, View } from "react-native";
import { Card, LinkButton, Screen } from "../../src/components/ui";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { summarizeCare } from "../../src/lib/careHistory";

export default function StatisticsScreen() {
  const { entries, loading, error, child } = useCareHistory();
  const [year, setYear] = useState(new Date().getFullYear());
  const inYear = entries.filter(
    (e) => new Date(e.occurred_at).getFullYear() === year,
  );
  const total = summarizeCare(inYear);
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <LinkButton title="‹ Năm trước" onPress={() => setYear((y) => y - 1)} />
        <Text style={{ fontSize: 24, fontWeight: "700" }}>{year}</Text>
        <LinkButton
          title="Năm sau ›"
          disabled={year >= new Date().getFullYear()}
          onPress={() => setYear((y) => y + 1)}
        />
      </View>
      <Text style={{ color: "#89747E" }}>
        Những ngày chăm {child?.nickname || child?.name || "con"} · Chỉ tính các
        lần đã ghi trong app, không ước tính ngày bỏ trống.
      </Text>
      {loading ? (
        <Text>Đang tính số liệu…</Text>
      ) : error ? (
        <Text>{error}</Text>
      ) : (
        <>
          <Card>
            <Text style={{ fontSize: 24, fontWeight: "700" }}>
              {total.records} ghi nhận
            </Text>
            <Text>Sữa bé uống: {total.milk.toLocaleString("vi-VN")} ml</Text>
            <Text>Sữa mẹ hút: {total.pumped.toLocaleString("vi-VN")} ml</Text>
            <Text>
              Ngủ đã ghi: {Math.floor(total.sleep / 60)} giờ{" "}
              {Math.round(total.sleep % 60)} phút
            </Text>
            <Text>Thay bỉm: {total.diapers} lần</Text>
            <Text style={{ color: "#89747E", marginTop: 8 }}>
              Thời gian bú mẹ không quy đổi thành ml.
            </Text>
          </Card>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Theo tháng</Text>
          {Array.from({ length: 12 }, (_, month) => {
            const data = summarizeCare(
              inYear.filter(
                (e) => new Date(e.occurred_at).getMonth() === month,
              ),
            );
            return (
              <Card key={month}>
                <Text style={{ fontWeight: "700" }}>
                  Tháng {month + 1} · {data.records} ghi nhận
                </Text>
                <Text style={{ color: "#89747E", marginTop: 6 }}>
                  {data.records
                    ? `Bé uống ${data.milk} ml · Mẹ hút ${data.pumped} ml · ${data.diapers} lần thay bỉm`
                    : "Chưa có dữ liệu"}
                </Text>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
