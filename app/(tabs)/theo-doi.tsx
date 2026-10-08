import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { useApp } from "../../src/providers/AppProvider";
import { colors, radius, spacing } from "../../src/theme";
import type { CareEntry, CareKind } from "../../src/types";

export default function TrackingScreen() {
  const { entries: latest, child } = useApp();
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<CareEntry[]>(latest);
  const [limit, setLimit] = useState(80);
  const [filter, setFilter] = useState<CareKind | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      if (!child) return;
      let active = true;
      db.getAllAsync<CareEntry>(
        "SELECT * FROM care_entries WHERE child_id=? AND deleted_at IS NULL ORDER BY occurred_at DESC LIMIT ?",
        child.id,
        limit,
      )
        .then((rows) => {
          if (active)
            setEntries(
              rows.map((r) => ({
                ...r,
                details:
                  typeof r.details === "string"
                    ? JSON.parse(r.details)
                    : r.details,
              })),
            );
        })
        .catch(() => setError("Chưa tải được nhật ký."));
      return () => {
        active = false;
      };
    }, [db, child?.id, limit, latest]),
  );
  const today = new Date().toDateString();
  const todayEntries = entries.filter(
    (entry) => new Date(entry.occurred_at).toDateString() === today,
  );
  const total = (kind: CareKind) =>
    todayEntries
      .filter(
        (entry) =>
          entry.kind === kind && (kind !== "milk" || entry.unit === "ml"),
      )
      .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

  return (
    <Screen>
      <AppTitle
        eyebrow="Nhật ký của bé"
        title="Theo dõi hôm nay"
        subtitle="Mọi cập nhật của hai người xuất hiện chung trên cùng một dòng thời gian."
      />

      <View style={styles.summaryRow}>
        <Summary
          label="Sữa"
          value={`${total("milk")} ml`}
          color={colors.blueSoft}
        />
        <Summary
          label="Ngủ"
          value={`${total("sleep")} phút`}
          color={colors.lavenderSoft}
        />
        <Summary
          label="Bỉm"
          value={`${todayEntries.filter((item) => item.kind === "diaper").length} lần`}
          color={colors.amberSoft}
        />
      </View>

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
        <LinkButton title="Tất cả" onPress={() => setFilter(null)} />
        {(Object.keys(careMeta) as CareKind[]).map((kind) => (
          <LinkButton
            key={kind}
            title={`${filter === kind ? "✓ " : ""}${careMeta[kind].label}`}
            onPress={() => setFilter(kind)}
          />
        ))}
      </View>
      {error ? <Text>{error}</Text> : null}
      <Card>
        {entries.length ? (
          entries
            .filter((e) => !filter || e.kind === filter)
            .map((entry) => <CareTimelineItem key={entry.id} entry={entry} />)
        ) : (
          <EmptyState
            icon="time-outline"
            title="Chưa có hoạt động"
            body="Những lần cho ăn, ngủ, thay bỉm và sức khỏe sẽ hiển thị tại đây."
          />
        )}
      </Card>
      {entries.length >= limit ? (
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
