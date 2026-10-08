import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { careMeta } from "../data/care";
import { colors, radius, spacing } from "../theme";
import type { CareEntry } from "../types";
import { formatClock } from "./ui";
import { findAssistantTool, entryToolId } from "../data/assistant";
import { AssistantIcon } from "./AssistantIcon";

export function CareTimelineItem({ entry }: { entry: CareEntry }) {
  const meta = careMeta[entry.kind];
  const tool = findAssistantTool(entryToolId(entry));
  const label =
    entry.details?.tool === "easy_plan"
      ? "Lịch E.A.S.Y."
      : (tool?.title ?? meta.label);
  const value =
    entry.amount !== null
      ? `${entry.amount}${entry.unit ? ` ${entry.unit}` : ""}`
      : entry.note || "Đã ghi nhận";
  return (
    <Pressable
      style={styles.row}
      accessibilityLabel={`Sửa ${label}`}
      onPress={() =>
        router.push({ pathname: "/record/new", params: { id: entry.id } })
      }
    >
      {tool ? (
        <AssistantIcon tool={tool} size={42} />
      ) : (
        <View style={[styles.icon, { backgroundColor: meta.soft }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.line}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.time}>{formatClock(entry.occurred_at)}</Text>
        </View>
        <Text numberOfLines={2} style={styles.value}>
          {value}
        </Text>
        {entry.details && Object.keys(entry.details).length ? (
          <Text style={styles.author}>
            {Object.entries(entry.details)
              .filter(
                ([key]) =>
                  ![
                    "tool",
                    "sessionId",
                    "endedAt",
                    "referenceId",
                    "medalId",
                    "templateId",
                    "wakeTime",
                  ].includes(key),
              )
              .map(([, value]) => value)
              .join(" · ")}
          </Text>
        ) : null}
        <Text style={styles.author}>
          {new Date(entry.occurred_at).toLocaleDateString("vi-VN")}
          {entry.sync_state === "pending" ? " · Chờ đồng bộ" : ""}
        </Text>
        <Text style={styles.author}>{entry.created_by_name}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingBottom: spacing.md,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  time: { color: colors.inkMuted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 14 },
  author: { color: colors.inkMuted, fontSize: 12 },
});
