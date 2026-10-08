import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, LinkButton } from "../../src/components/ui";
import {
  activeVaccinations,
  formatLegacyRange,
  referenceRelease,
  vaccineGroups,
} from "../../src/data/reference";
import { useCareHistory } from "../../src/lib/useCareHistory";
import type { LegacyReferenceItem } from "../../src/types";

export default function VaccinationsScreen() {
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState(
    initialMode === "injections" ? "injections" : "schedule",
  );
  const [filter, setFilter] = useState("all");
  const { entries, child, loading, error } = useCareHistory();
  const saved = (id: string) =>
    entries.find(
      (e) => e.details?.tool === "injections" && e.details.referenceId === id,
    );
  const open = (item: LegacyReferenceItem, index: number) => {
    const existing = saved(item.id);
    router.push({
      pathname: "/record/new",
      params: existing
        ? { id: existing.id }
        : {
            tool: "injections",
            referenceId: item.id,
            vaccine: item.shortTitle || item.title,
            dose: String(index + 1),
          },
    });
  };
  return (
    <Screen contentStyle={{ padding: 0, paddingTop: 0, gap: 0 }}>
      <Stack.Screen
        options={{
          title: mode === "schedule" ? "Lịch tiêm phòng" : "Các mũi tiêm",
        }}
      />
      <View style={s.toolbar}>
        <Text style={s.child}>Bé {child?.nickname || child?.name}</Text>
        <LinkButton
          title={mode === "schedule" ? "Các mũi tiêm ›" : "‹ Lịch tiêm phòng"}
          onPress={() =>
            setMode((m) => (m === "schedule" ? "injections" : "schedule"))
          }
        />
      </View>
      <Text style={s.notice}>
        {referenceRelease.warning} Các ô số chỉ là mốc tham khảo, không phải chỉ
        định tiêm.
      </Text>
      <View style={s.toolbar}>
        {[
          ["all", "Tất cả"],
          ["recorded", "Đã ghi"],
          ["empty", "Chưa ghi"],
        ].map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setFilter(id!)}
            style={[s.filter, filter === id && { backgroundColor: "#E9E2F5" }]}
          >
            <Text style={s.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <Text style={s.notice}>Đang đọc sổ tiêm…</Text> : null}
      {error ? <Text style={s.notice}>{error}</Text> : null}
      {mode === "schedule" ? (
        <>
          <View style={[s.row, { backgroundColor: "#F6F5F8" }]}>
            <Text style={[s.cell, s.age, s.bold]}>Tháng tuổi</Text>
            <Text style={[s.cell, s.content, s.bold]}>Nội dung</Text>
            <Text style={[s.cell, s.status, s.bold]}>Ghi nhận</Text>
          </View>
          {activeVaccinations
            .filter(
              (item) =>
                filter === "all" ||
                (filter === "recorded" ? !!saved(item.id) : !saved(item.id)),
            )
            .map((item) => {
              const group = vaccineGroups.find((g) =>
                g.milestones.some((m) => m.id === item.id),
              );
              return (
                <View key={item.id} style={s.row}>
                  <Text style={[s.cell, s.age]}>{formatLegacyRange(item)}</Text>
                  <Pressable
                    style={[s.cell, s.content]}
                    onPress={() =>
                      router.push({
                        pathname: "/vaccine/[id]",
                        params: { id: item.id },
                      })
                    }
                  >
                    <Text style={s.bold}>{item.title.replace(/\n/g, " ")}</Text>
                    <Text style={s.description}>{item.description}</Text>
                    <Text style={s.link}>Xem thông tin ›</Text>
                  </Pressable>
                  <Pressable
                    style={[s.cell, s.status]}
                    onPress={() =>
                      open(
                        item,
                        group?.milestones.findIndex((m) => m.id === item.id) ??
                          0,
                      )
                    }
                  >
                    <Text
                      style={{
                        color: saved(item.id) ? "#45947B" : "#8E70CA",
                        fontSize: 12,
                      }}
                    >
                      {saved(item.id) ? "Đã ghi ✓" : "+ Ghi"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
        </>
      ) : (
        vaccineGroups.map((group) => {
          const milestones = group.milestones.filter(
            (m) =>
              filter === "all" ||
              (filter === "recorded" ? !!saved(m.id) : !saved(m.id)),
          );
          if (!milestones.length) return null;
          return (
            <View key={group.name} style={s.row}>
              <Text style={[s.cell, { width: "34%" }]}>{group.name}</Text>
              <View style={s.doses}>
                {milestones.map((item) => {
                  const index = group.milestones.findIndex(
                    (m) => m.id === item.id,
                  );
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${group.name}, mốc ${index + 1}, ${saved(item.id) ? "đã ghi" : "chưa ghi"}`}
                      onPress={() => open(item, index)}
                      style={[
                        s.dose,
                        saved(item.id) && { backgroundColor: "#DDF1E9" },
                      ]}
                    >
                      <Text
                        style={{
                          color: saved(item.id) ? "#45947B" : "#9CAAB2",
                          fontSize: 21,
                          fontFamily: "QuicksandBold",
                        }}
                      >
                        {index + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })
      )}
      <View style={{ padding: 16 }}>
        <LinkButton
          title="Ghi mũi khác ngoài danh sách"
          onPress={() =>
            router.push({
              pathname: "/record/new",
              params: { tool: "injections" },
            })
          }
        />
        <LinkButton
          title="Lịch sử tất cả mũi đã ghi"
          onPress={() =>
            router.push({
              pathname: "/assistant/[tool]",
              params: { tool: "injections" },
            })
          }
        />
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    gap: 8,
  },
  child: { fontFamily: "QuicksandSemiBold", fontSize: 16, flex: 1 },
  notice: {
    color: "#887549",
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: "#FFF9EB",
    padding: 12,
  },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#EEE" },
  cell: {
    paddingHorizontal: 9,
    paddingVertical: 18,
    borderRightWidth: 1,
    borderColor: "#EEE",
    fontFamily: "Quicksand",
    fontSize: 14,
    color: "#303B46",
  },
  age: { width: "20%", textAlign: "center", alignSelf: "center" },
  content: { width: "60%" },
  status: {
    width: "20%",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  bold: { fontFamily: "QuicksandSemiBold", fontSize: 15, color: "#303B46" },
  description: {
    fontFamily: "Quicksand",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  link: { color: "#8E70CA", marginTop: 8, fontSize: 12 },
  doses: {
    width: "66%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  dose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  filter: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    flex: 1,
    alignItems: "center",
  },
  label: { fontFamily: "Quicksand", color: "#645783" },
});
