import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TeethDiagram } from "./TeethDiagram";
import { CareTimelineItem } from "./CareTimelineItem";
import { Screen } from "./ui";
import type { CareEntry } from "../types";

export function TeethScreen({
  history,
  childName,
  loading,
  error,
}: {
  history: CareEntry[];
  childName: string;
  loading: boolean;
  error: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = new Set(history.map((e) => e.details?.tooth).filter(Boolean))
    .size;
  return (
    <Screen contentStyle={{ paddingHorizontal: 0, gap: 0 }}>
      <Stack.Screen options={{ title: "Mọc răng" }} />
      <View
        style={{
          padding: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderColor: "#EEE",
        }}
      >
        <Text
          style={{
            fontFamily: "QuicksandSemiBold",
            fontSize: 18,
            color: "#303B46",
          }}
        >
          {childName}
        </Text>
        <Text
          style={{ fontFamily: "Quicksand", fontSize: 15, color: "#858A91" }}
        >
          {count} / 20 răng đã ghi
        </Text>
      </View>
      {loading || error ? (
        <Text style={{ padding: 20 }}>{error || "Đang tải…"}</Text>
      ) : null}
      <View
        style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}
      >
        <TeethDiagram
          records={history}
          onSelect={(tooth, entry) =>
            router.push({
              pathname: "/record/new",
              params: entry ? { id: entry.id } : { tool: "teeth", tooth },
            })
          }
        />
      </View>
      <Pressable
        style={{
          minHeight: 56,
          justifyContent: "center",
          paddingHorizontal: 20,
          backgroundColor: "#F3F4F7",
        }}
        onPress={() => setExpanded((v) => !v)}
      >
        <Text
          style={{
            fontFamily: "QuicksandSemiBold",
            color: "#8E70CA",
            fontSize: 16,
          }}
        >
          {expanded ? "▾" : "▸"} Lịch sử mọc răng ({history.length})
        </Text>
      </Pressable>
      {expanded ? (
        <View style={{ paddingHorizontal: 20 }}>
          {history.map((entry) => (
            <CareTimelineItem key={entry.id} entry={entry} />
          ))}
        </View>
      ) : null}
      <Text
        style={{
          fontFamily: "Quicksand",
          fontSize: 13,
          color: "#858A91",
          lineHeight: 21,
          padding: 20,
        }}
      >
        Ghi ngày mọc thực tế của con. Hình dáng và số trên sơ đồ theo app gốc;
        không dùng thời điểm mọc răng để tự chẩn đoán.
      </Text>
    </Screen>
  );
}
