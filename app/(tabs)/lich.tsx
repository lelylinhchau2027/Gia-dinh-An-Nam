import { FormInput as TextInput } from "../../src/components/FormInput";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { handbookArticles } from "../../src/data/handbook";
import { formStyles } from "../../src/components/forms";
import { TabHeading } from "../../src/components/TabHeading";
import { Card, Pill, Screen } from "../../src/components/ui";
import {
  easyTemplates,
  formatLegacyRange,
  legacyPregnancyExaminations,
  referenceRelease,
  vaccineGroups,
} from "../../src/data/reference";
import { colors, radius, spacing } from "../../src/theme";

type Section = "articles" | "vaccines" | "easy" | "pregnancy";

export default function ReferenceScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<Section>("articles");
  const [search, setSearch] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.multiGet(handbookArticles.map((a) => `bookmark:${a.id}`))
        .then((rows) =>
          setSaved(
            rows
              .filter((r) => r[1] === "1")
              .map((r) => r[0].replace("bookmark:", "")),
          ),
        )
        .catch(() => undefined);
    }, []),
  );
  useEffect(() => {
    if (
      ["articles", "vaccines", "easy", "pregnancy"].includes(
        params.section ?? "",
      )
    )
      setSection(params.section as Section);
  }, [params.section]);
  const matches = (text: string) =>
    text
      .toLocaleLowerCase("vi")
      .includes(search.trim().toLocaleLowerCase("vi"));
  return (
    <Screen
      stickyHeaderIndices={[0]}
      safeAreaStyle={{ backgroundColor: "#7771BC" }}
      contentStyle={{
        paddingHorizontal: 0,
        gap: 0,
        flexGrow: 1,
        backgroundColor: "#fff",
      }}
    >
      <TabHeading title="Cẩm nang" />

      {section !== "articles" ? (
        <View style={styles.notice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={colors.amber}
          />
          <View style={styles.grow}>
            <Text style={styles.noticeTitle}>{referenceRelease.label}</Text>
            <Text style={styles.noticeBody}>{referenceRelease.warning}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.segment}>
        <Segment
          label="Bài đọc"
          active={section === "articles"}
          onPress={() => setSection("articles")}
        />
        <Segment
          label="Tiêm phòng"
          active={section === "vaccines"}
          onPress={() => setSection("vaccines")}
        />
        <Segment
          label="E.A.S.Y"
          active={section === "easy"}
          onPress={() => setSection("easy")}
        />
        <Segment
          label="Khám thai"
          active={section === "pregnancy"}
          onPress={() => setSection("pregnancy")}
        />
      </View>
      <TextInput
        style={[formStyles.input, { margin: 16 }]}
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm trong cẩm nang…"
      />
      {section === "articles" ? (
        <>
          <Pressable onPress={() => setOnlySaved(!onlySaved)}>
            <Pill
              label={
                onlySaved ? "♥ Đang xem bài đã lưu" : "♡ Chỉ xem bài đã lưu"
              }
            />
          </Pressable>
          {handbookArticles
            .filter(
              (a) =>
                matches(`${a.title} ${a.category}`) &&
                (!onlySaved || saved.includes(a.id)),
            )
            .map((a) => (
              <Pressable
                key={a.id}
                onPress={() => router.push(`/handbook/${a.id}`)}
              >
                <Card
                  style={[
                    formStyles.gap,
                    {
                      borderRadius: 0,
                      borderWidth: 0,
                      borderBottomWidth: 1,
                      elevation: 0,
                      shadowOpacity: 0,
                    },
                  ]}
                >
                  <Pill label={a.category} />
                  <Text style={styles.listTitle}>{a.title}</Text>
                  <Text style={styles.description}>{a.summary}</Text>
                  <Text style={styles.listMeta}>
                    {a.reviewed
                      ? `Nguồn WHO · ${a.reviewed}`
                      : "Hướng dẫn / tham khảo"}
                    {saved.includes(a.id) ? " · ♥" : ""}
                  </Text>
                </Card>
              </Pressable>
            ))}
        </>
      ) : null}

      {section === "vaccines"
        ? vaccineGroups
            .filter((g) => matches(g.name))
            .map((group) => (
              <Pressable
                key={group.name}
                onPress={() =>
                  router.push(`/vaccine/${group.milestones[0]?.id}`)
                }
              >
                <Card style={styles.listCard}>
                  <View style={styles.listIcon}>
                    <Ionicons
                      name="medical-outline"
                      size={23}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.listTitle}>{group.name}</Text>
                    <Text style={styles.listMeta}>
                      {group.milestones.length} mốc ·{" "}
                      {formatLegacyRange(group.milestones[0]!)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.inkMuted}
                  />
                </Card>
              </Pressable>
            ))
        : null}

      {section === "easy"
        ? easyTemplates
            .filter((t) => matches(`E.A.S.Y ${t.name}`))
            .map((template) => (
              <Pressable
                key={template.id}
                onPress={() => router.push(`/easy/${template.id}`)}
              >
                <Card style={styles.listCard}>
                  <View
                    style={[
                      styles.listIcon,
                      { backgroundColor: colors.lavenderSoft },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={23}
                      color={colors.lavender}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.listTitle}>
                      E.A.S.Y {template.name}
                    </Text>
                    <Text style={styles.listMeta}>
                      Tuần {template.fromWeek}–{template.toWeek ?? "trở đi"} ·{" "}
                      {template.easyTimeGroups.reduce(
                        (count, group) => count + group.easyTimes.length,
                        0,
                      )}{" "}
                      khung
                    </Text>
                  </View>
                  <Pill label="Mẫu gốc" tone="blue" />
                </Card>
              </Pressable>
            ))
        : null}

      {section === "pregnancy"
        ? legacyPregnancyExaminations
            .filter((i) => matches(`${i.title} ${formatLegacyRange(i)}`))
            .map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/handbook/${item.id}`)}
              >
                <Card style={styles.listCard}>
                  <View
                    style={[
                      styles.listIcon,
                      { backgroundColor: colors.sageSoft },
                    ]}
                  >
                    <Ionicons
                      name="heart-outline"
                      size={23}
                      color={colors.sage}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.listTitle}>{item.title}</Text>
                    <Text style={styles.listMeta}>
                      {formatLegacyRange(item)}
                    </Text>
                    {item.description ? (
                      <Text numberOfLines={2} style={styles.description}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            ))
        : null}
    </Screen>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
  },
  noticeTitle: { color: colors.ink, fontWeight: "900", marginBottom: 3 },
  noticeBody: { color: colors.inkMuted, fontSize: 13, lineHeight: 18 },
  grow: { flex: 1 },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    padding: 4,
    borderRadius: radius.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.inkMuted, fontSize: 13, fontWeight: "700" },
  segmentTextActive: { color: colors.primary, fontWeight: "900" },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  listTitle: {
    color: colors.ink,
    fontFamily: "QuicksandSemiBold",
    fontSize: 17,
  },
  listMeta: { color: colors.inkMuted, fontSize: 13, marginTop: 3 },
  description: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
});
