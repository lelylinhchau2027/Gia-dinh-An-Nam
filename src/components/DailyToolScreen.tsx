import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "./ui";
import { DayPicker, localDay } from "./DayPicker";
import { AssistantIcon } from "./AssistantIcon";
import { CareTimelineItem } from "./CareTimelineItem";
import { careDay, dailyTotals, feelingEmoji, shiftDay } from "../lib/dailyCare";
import type { AssistantTool } from "../data/assistant";
import type { CareEntry } from "../types";

export function DailyToolScreen({
  tool,
  history,
  childName,
  loading,
  error,
}: {
  tool: AssistantTool;
  history: CareEntry[];
  childName: string;
  loading: boolean;
  error: string;
}) {
  const [day, setDay] = useState(localDay(new Date()));
  const [all, setAll] = useState(false);
  const [limit, setLimit] = useState(50);
  const today = localDay(new Date());
  const daily = history.filter((e) => careDay(e.occurred_at) === day);
  const rows = all ? history : daily;
  const change = (value: string) => {
    setDay(value);
    setAll(false);
    setLimit(50);
  };
  const add = () =>
    router.push({
      pathname: "/record/new",
      params: { tool: tool.id, kind: tool.kind, day },
    });
  const total = ["temperature", "fetal", "mom", "medicine"].includes(tool.id)
    ? ""
    : dailyTotals(daily);
  return (
    <Screen contentStyle={s.content}>
      <Stack.Screen options={{ title: tool.title }} />
      <View style={s.child}>
        <Text style={s.childLabel}>Bé</Text>
        <Text style={s.childName}>{childName}</Text>
      </View>
      <View style={s.dateRow}>
        <Pressable
          accessibilityLabel="Ngày trước"
          style={s.arrow}
          onPress={() => change(shiftDay(day, -1))}
        >
          <Ionicons name="chevron-back" size={22} color="#8E70CA" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <DayPicker value={day} onChange={change} />
        </View>
        <Pressable
          accessibilityLabel="Ngày sau"
          disabled={day >= today}
          style={[s.arrow, day >= today && { opacity: 0.25 }]}
          onPress={() => change(shiftDay(day, 1))}
        >
          <Ionicons name="chevron-forward" size={22} color="#8E70CA" />
        </Pressable>
      </View>
      {tool.id === "feeling" ? (
        <FeelingCalendar day={day} onChange={change} entries={history} />
      ) : null}
      <View style={s.summary}>
        <AssistantIcon tool={tool} size={55} />
        <View style={{ flex: 1 }}>
          <Text style={s.summaryLabel}>Tổng trong ngày</Text>
          <Text style={s.total}>{total || `${daily.length} lần`}</Text>
          {total ? (
            <Text style={s.summaryLabel}>{daily.length} lần ghi nhận</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Thêm ${tool.title.toLowerCase()}`}
          testID="add-care-record"
          style={s.add}
          onPress={add}
        >
          <Text style={s.addText}>＋ Thêm</Text>
        </Pressable>
      </View>
      <View style={s.historyHeading}>
        <Text style={s.title}>{all ? "Tất cả ghi nhận" : "Trong ngày"}</Text>
        <Pressable onPress={() => setAll((v) => !v)} style={s.historyLink}>
          <Text style={s.link}>
            {all ? "Về ngày đang chọn" : "Xem mọi ngày"}
          </Text>
        </Pressable>
      </View>
      {loading ? (
        <Text style={s.empty}>Đang tải…</Text>
      ) : error ? (
        <Text style={s.empty}>{error}</Text>
      ) : rows.length ? (
        <View style={s.entries}>
          {rows.slice(0, limit).map((entry) => (
            <CareTimelineItem key={entry.id} entry={entry} />
          ))}
        </View>
      ) : (
        <View style={s.emptyBox}>
          <Text style={s.empty}>
            Chưa có ghi nhận{all ? "" : " trong ngày này"}.
          </Text>
          <Pressable onPress={add} style={s.historyLink}>
            <Text style={s.link}>＋ Thêm ghi nhận đầu tiên</Text>
          </Pressable>
        </View>
      )}
      {rows.length > limit ? (
        <Pressable
          style={s.historyLink}
          onPress={() => setLimit((n) => n + 50)}
        >
          <Text style={s.link}>Xem thêm</Text>
        </Pressable>
      ) : null}
      {tool.hint ? <Text style={s.hint}>{tool.hint}</Text> : null}
    </Screen>
  );
}

function FeelingCalendar({
  day,
  onChange,
  entries,
}: {
  day: string;
  onChange: (day: string) => void;
  entries: CareEntry[];
}) {
  const month = new Date(`${day}T12:00:00`);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const byDay = new Map<string, string>();
  // History is newest-first; keep the last feeling recorded on each day.
  for (const entry of entries) {
    const key = careDay(entry.occurred_at);
    if (!byDay.has(key))
      byDay.set(key, feelingEmoji[entry.details?.feeling ?? ""] ?? "•");
  }
  return (
    <View style={s.calendar}>
      <Text style={s.month}>
        Cảm xúc tháng {month.getMonth() + 1}/{month.getFullYear()}
      </Text>
      <View style={s.week}>
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
          <Text key={label} style={s.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={s.week}>
        {Array.from({ length: offset }, (_, i) => (
          <View key={`empty${i}`} style={s.day} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const value = localDay(
            new Date(month.getFullYear(), month.getMonth(), i + 1),
          );
          const future = value > localDay(new Date());
          return (
            <Pressable
              key={value}
              accessibilityLabel={`Cảm xúc ngày ${value}`}
              disabled={future}
              onPress={() => onChange(value)}
              style={[
                s.day,
                value === day && s.selected,
                future && { opacity: 0.3 },
              ]}
            >
              <Text style={s.dayNumber}>{i + 1}</Text>
              <Text style={s.emoji}>{byDay.get(value) ?? ""}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 0, gap: 0, paddingTop: 0 },
  child: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  childLabel: { fontFamily: "Quicksand", color: "#858A91", fontSize: 16 },
  childName: {
    fontFamily: "QuicksandSemiBold",
    color: "#303B46",
    fontSize: 18,
  },
  dateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  arrow: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    backgroundColor: "#F7F8FA",
  },
  summaryLabel: { fontFamily: "Quicksand", color: "#858A91", fontSize: 13 },
  total: {
    fontFamily: "QuicksandSemiBold",
    fontSize: 23,
    color: "#303B46",
    marginVertical: 4,
  },
  add: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  addText: { fontFamily: "QuicksandSemiBold", fontSize: 17, color: "#8E70CA" },
  historyHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    minHeight: 56,
  },
  title: { fontFamily: "QuicksandSemiBold", fontSize: 17, color: "#303B46" },
  historyLink: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  link: { fontFamily: "QuicksandSemiBold", fontSize: 14, color: "#8E70CA" },
  entries: { paddingHorizontal: 20 },
  empty: {
    fontFamily: "Quicksand",
    color: "#858A91",
    fontSize: 15,
    padding: 20,
    textAlign: "center",
  },
  emptyBox: { paddingVertical: 20 },
  hint: {
    fontFamily: "Quicksand",
    color: "#858A91",
    fontSize: 13,
    lineHeight: 20,
    padding: 20,
  },
  calendar: { padding: 12 },
  month: {
    fontFamily: "QuicksandSemiBold",
    textAlign: "center",
    fontSize: 17,
    paddingBottom: 16,
    color: "#303B46",
  },
  week: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#858A91",
    fontFamily: "Quicksand",
    paddingBottom: 10,
  },
  day: {
    width: `${100 / 7}%`,
    minHeight: 58,
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 4,
  },
  selected: { backgroundColor: "#E9E2F5" },
  dayNumber: { fontSize: 13, color: "#303B46", fontFamily: "Quicksand" },
  emoji: { fontSize: 22 },
});
