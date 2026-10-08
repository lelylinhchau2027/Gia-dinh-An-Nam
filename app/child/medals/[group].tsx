import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui";
import { medalGroups, completedMedalIds } from "../../../src/data/medals";
import images from "../../../src/data/legacyImageSources.json";
import { useCareHistory } from "../../../src/lib/useCareHistory";

export default function MedalListScreen() {
  const { group: id } = useLocalSearchParams<{ group: string }>();
  const { entries, loading, error } = useCareHistory();
  const group = medalGroups.find((g) => g.id === id);
  if (!group)
    return (
      <Screen>
        <Text>Không tìm thấy nhóm huy chương.</Text>
      </Screen>
    );
  const done = completedMedalIds(entries);
  return (
    <Screen contentStyle={{ paddingHorizontal: 12, paddingTop: 16 }}>
      <Stack.Screen options={{ title: group.name }} />
      <Text
        style={{
          fontFamily: "QuicksandSemiBold",
          fontSize: 19,
          color: group.color,
        }}
      >
        {group.items.filter((item) => done.has(item.id)).length} /{" "}
        {group.totalMedalCount} huy chương
      </Text>
      {loading || error ? <Text>{error || "Đang tải…"}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {group.items.map((item) => {
          const existing = entries.find(
            (e) =>
              e.details?.tool === "milestones" && e.details.medalId === item.id,
          );
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}${existing ? ", đã ghi, sửa ngày" : ""}`}
              style={{
                width: "48%",
                flexGrow: 1,
                flexBasis: "45%",
                padding: 14,
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                backgroundColor: existing ? "#FBF4DF" : "#F4F5F7",
              }}
              onPress={() =>
                router.push({
                  pathname: "/record/new",
                  params: existing
                    ? { id: existing.id }
                    : {
                        tool: "milestones",
                        medalId: item.id,
                        milestone: item.title,
                        category: group.category,
                      },
                })
              }
            >
              <Image
                source={images["ic_medal.or8"]}
                style={{ width: 70, height: 70, opacity: existing ? 1 : 0.3 }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontFamily: "Quicksand",
                  color: "#303B46",
                  fontSize: 15,
                  lineHeight: 21,
                  textAlign: "center",
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontFamily: "QuicksandSemiBold",
                  color: "#8E70CA",
                  fontSize: 13,
                }}
              >
                {existing
                  ? new Date(existing.occurred_at).toLocaleDateString("vi-VN")
                  : "＋ Ghi ngày đạt"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
