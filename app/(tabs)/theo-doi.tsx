import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DayPicker, localDay } from "../../src/components/DayPicker";
import { assistantTools, entryToolId } from "../../src/data/assistant";
import { AssistantIcon } from "../../src/components/AssistantIcon";
import { AppTitle } from "../../src/components/AppTitle";
import { CareTimelineItem } from "../../src/components/CareTimelineItem";
import {
  Card,
  EmptyState,
  LinkButton,
  Screen,
  SectionHeader,
} from "../../src/components/ui";
import { careMeta, quickCareKinds } from "../../src/data/care";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { summarizeCare } from "../../src/lib/careHistory";
import { colors, radius, spacing } from "../../src/theme";
import type { CareEntry, CareKind } from "../../src/types";

export default function TrackingScreen() {
  const { entries, error, loading } = useCareHistory();
  const [limit, setLimit] = useState(80);
  const [filter, setFilter] = useState<CareKind | null>(null);
  const [day, setDay] = useState(localDay(new Date()));
  const [allDays, setAllDays] = useState(false);
  const [toolFilter, setToolFilter] = useState<string | null>(null);
  const todayEntries = entries.filter(
    (entry) => localDay(new Date(entry.occurred_at)) === day,
  );
  const total = summarizeCare(todayEntries);
  const filtered = (allDays ? entries : todayEntries).filter(
    (e) =>
      (!filter || e.kind === filter) &&
      (!toolFilter || entryToolId(e) === toolFilter),
  );

  return (
    <Screen>
      <AppTitle
        eyebrow="Nhật ký của bé"
        title="Hoạt động trong ngày"
        subtitle="Mọi cập nhật của hai người xuất hiện chung trên cùng một dòng thời gian."
      />
      <DayPicker
        value={day}
        onChange={(value) => {
          setDay(value);
          setAllDays(false);
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
      >
        {assistantTools
          .filter((t) =>
            [
              "feeling",
              "milk",
              "pump",
              "sleep",
              "diaper",
              "weaning",
              "activity",
            ].includes(t.id),
          )
          .map((tool) => {
            const rows = todayEntries.filter((e) => entryToolId(e) === tool.id);
            const value =
              tool.id === "milk"
                ? `${total.milk} ml`
                : tool.id === "pump"
                  ? `${total.pumped} ml`
                  : tool.id === "sleep"
                    ? `${total.sleep} phút`
                    : `${rows.length} lần`;
            return (
              <Pressable
                key={tool.id}
                onPress={() => {
                  setToolFilter(tool.id);
                  setFilter(null);
                }}
                style={{
                  width: 116,
                  padding: 14,
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 16,
                  backgroundColor:
                    toolFilter === tool.id ? "#E9E2F5" : "#F7F5FA",
                }}
              >
                <AssistantIcon tool={tool} />
                <Text
                  style={{
                    fontFamily: "QuicksandSemiBold",
                    textAlign: "center",
                  }}
                >
                  {tool.title}
                </Text>
                <Text style={{ color: colors.inkMuted }}>{value}</Text>
              </Pressable>
            );
          })}
      </ScrollView>

      <View style={styles.summaryRow}>
        <Summary
          label="Bé uống"
          value={`${total.milk} ml`}
          color={colors.blueSoft}
        />
        <Summary
          label="Ngủ"
          value={`${total.sleep} phút`}
          color={colors.lavenderSoft}
        />
        <Summary
          label="Bỉm"
          value={`${todayEntries.filter((item) => item.kind === "diaper").length} lần`}
          color={colors.amberSoft}
        />
      </View>
      <Text style={{ color: colors.inkMuted }}>
        Mẹ hút: {total.pumped} ml · Không cộng vào lượng bé đã uống
      </Text>

      <SectionHeader title="Thêm hoạt động" />
      <View style={styles.kindRow}>
        {quickCareKinds.map((kind) => {
          const meta = careMeta[kind];
          return (
            <Pressable
              key={kind}
              onPress={() =>
                router.push({ pathname: "/record/new", params: { kind } })
              }
              style={styles.kindButton}
            >
              <Ionicons name={meta.icon} size={20} color={meta.color} />
              <Text style={styles.kindLabel}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Dòng thời gian" />
      <View style={styles.kindRow}>
        <LinkButton
          title="Tất cả mục"
          onPress={() => {
            setFilter(null);
            setToolFilter(null);
          }}
        />
        <LinkButton
          title={allDays ? "✓ Mọi ngày" : "Xem mọi ngày"}
          onPress={() => setAllDays((v) => !v)}
        />
        {(Object.keys(careMeta) as CareKind[]).map((kind) => (
          <LinkButton
            key={kind}
            title={`${filter === kind ? "✓ " : ""}${careMeta[kind].label}`}
            onPress={() => {
              setFilter(kind);
              setToolFilter(null);
            }}
          />
        ))}
      </View>
      {error ? <Text>{error}</Text> : null}
      {loading ? <Text>Đang tải nhật ký…</Text> : null}
      <Card>
        {filtered.length ? (
          filtered
            .slice(0, limit)
            .map((entry) => <CareTimelineItem key={entry.id} entry={entry} />)
        ) : (
          <EmptyState
            icon="time-outline"
            title="Chưa có hoạt động"
            body="Những lần cho ăn, ngủ, thay bỉm và sức khỏe sẽ hiển thị tại đây."
          />
        )}
      </Card>
      {filtered.length > limit ? (
        <LinkButton
          title="Tải nhật ký cũ hơn"
          onPress={() => setLimit((v) => v + 80)}
        />
      ) : null}
    </Screen>
  );
}

function Summary({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.summary, { backgroundColor: color }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: spacing.sm },
  summary: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: "700" },
  summaryValue: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  kindButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  kindLabel: { color: colors.ink, fontWeight: "700", fontSize: 13 },
});
