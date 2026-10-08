import { router, Stack } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Polygon } from "react-native-svg";
import { Screen } from "./ui";
import { medalGroups, completedMedalIds } from "../data/medals";
import type { CareEntry } from "../types";

export function MedalGroupsScreen({
  history,
  childName,
}: {
  history: CareEntry[];
  childName: string;
}) {
  const done = completedMedalIds(history);
  const stats = medalGroups.map(
    (g) => g.items.filter((item) => done.has(item.id)).length,
  );
  const point = (i: number, fraction: number) => {
    const angle = ((i * 72 - 90) * Math.PI) / 180;
    return `${140 + Math.cos(angle) * 105 * fraction},${130 + Math.sin(angle) * 105 * fraction}`;
  };
  return (
    <Screen contentStyle={{ paddingHorizontal: 0, gap: 0 }}>
      <Stack.Screen options={{ title: "Huy chương của bé" }} />
      <Text style={s.name}>{childName}</Text>
      <Text style={s.total}>{done.size} / 64 huy chương</Text>
      <View style={s.radar}>
        <Svg width={280} height={250} viewBox="0 0 280 250">
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <Polygon
              key={r}
              points={medalGroups.map((_, i) => point(i, r)).join(" ")}
              fill="none"
              stroke="#DFE2E7"
            />
          ))}
          {medalGroups.map((_, i) => {
            const [x, y] = point(i, 1).split(",");
            return (
              <Line
                key={i}
                x1={140}
                y1={130}
                x2={Number(x)}
                y2={Number(y)}
                stroke="#DFE2E7"
              />
            );
          })}
          <Polygon
            points={medalGroups
              .map((g, i) => point(i, stats[i]! / g.totalMedalCount))
              .join(" ")}
            fill="#B4A1D666"
            stroke="#8E70CA"
            strokeWidth={2}
          />
        </Svg>
      </View>
      <View style={s.legend}>
        {medalGroups.map((g, i) => (
          <Text key={g.id} style={[s.legendText, { color: g.color }]}>
            {g.name}: {stats[i]}/{g.totalMedalCount}
          </Text>
        ))}
      </View>
      <View style={s.grid}>
        {medalGroups.map((group, i) => (
          <Pressable
            key={group.id}
            accessibilityRole="button"
            accessibilityLabel={`Huy chương ${group.name}`}
            style={s.group}
            onPress={() =>
              router.push({
                pathname: "/child/medals/[group]",
                params: { group: group.id },
              })
            }
          >
            <Image source={group.image} style={s.image} resizeMode="contain" />
            <Text style={[s.groupName, { color: group.color }]}>
              {group.name}
            </Text>
            <Text style={s.count}>
              {stats[i]} / {group.totalMedalCount}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.note}>
        64 mục từ dữ liệu gốc, dùng lưu kỷ niệm. Biểu đồ thể hiện số mục gia
        đình đã ghi, không phải đánh giá hoặc chuẩn phát triển của trẻ.
      </Text>
      <Pressable
        style={s.custom}
        onPress={() =>
          router.push({
            pathname: "/record/new",
            params: { tool: "milestones" },
          })
        }
      >
        <Text style={s.link}>＋ Thêm kỷ niệm khác</Text>
      </Pressable>
      {history.some((e) => !e.details?.medalId) ? (
        <Text style={s.note}>
          Các kỷ niệm cũ vẫn có trong nhật ký chung; không tự gán chúng vào huy
          chương hay cộng trùng.
        </Text>
      ) : null}
    </Screen>
  );
}
const s = StyleSheet.create({
  name: {
    textAlign: "center",
    fontFamily: "QuicksandSemiBold",
    color: "#303B46",
    fontSize: 23,
    marginTop: 20,
  },
  total: {
    textAlign: "center",
    fontFamily: "Quicksand",
    color: "#858A91",
    fontSize: 16,
    marginTop: 8,
  },
  radar: { alignItems: "center" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  legendText: { fontFamily: "QuicksandSemiBold", fontSize: 13 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    backgroundColor: "#F2F2F2",
    padding: 10,
  },
  group: { width: "47%", alignItems: "center", paddingVertical: 18, gap: 8 },
  image: { width: 120, height: 140 },
  groupName: { fontFamily: "QuicksandSemiBold", fontSize: 18 },
  count: { color: "#858A91", fontSize: 15, fontFamily: "Quicksand" },
  note: {
    fontFamily: "Quicksand",
    fontSize: 13,
    lineHeight: 20,
    color: "#858A91",
    padding: 20,
  },
  custom: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  link: { fontFamily: "QuicksandSemiBold", fontSize: 16, color: "#8E70CA" },
});
