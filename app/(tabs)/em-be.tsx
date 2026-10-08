import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "../../src/components/ui";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import { AssistantIcon } from "../../src/components/AssistantIcon";
import {
  assistantTools,
  bornTools,
  pregnancyTools,
  type AssistantTool,
} from "../../src/data/assistant";
import { useApp } from "../../src/providers/AppProvider";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { GrowthChart } from "../../src/components/GrowthChart";

export default function BabyScreen() {
  const { child } = useApp();
  const { entries } = useCareHistory();
  const { width, fontScale } = useWindowDimensions();
  const [branch, setBranch] = useState<"pregnancy" | "born" | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const stage =
    branch ?? (child?.due_date && !child.birthday ? "pregnancy" : "born");
  const preferenceKey = `assistant-tools:${child?.id ?? "local"}:${stage}`;
  useEffect(() => {
    let active = true;
    setReady(false);
    setEditing(false);
    AsyncStorage.getItem(preferenceKey)
      .then((value) => {
        const parsed: unknown = value ? JSON.parse(value) : [];
        if (active)
          setHidden(
            Array.isArray(parsed)
              ? parsed.filter((v): v is string => typeof v === "string")
              : [],
          );
      })
      .catch(() => {
        if (active) setHidden([]);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [preferenceKey]);
  const savePreferences = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(preferenceKey, JSON.stringify(hidden));
      setEditing(false);
    } catch {
      Alert.alert("Chưa lưu được", "Hãy thử lại để giữ cách hiển thị này.");
    } finally {
      setSaving(false);
    }
  };
  const open = (tool: AssistantTool) => {
    if (editing) {
      setHidden((items) =>
        items.includes(tool.id)
          ? items.filter((id) => id !== tool.id)
          : [...items, tool.id],
      );
      return;
    }
    if (tool.route)
      router.push({
        pathname: tool.route as never,
        params: tool.section
          ? tool.id === "injections"
            ? { mode: tool.section }
            : { section: tool.section }
          : {},
      });
    else if (["teeth", "kick", "milestones"].includes(tool.id))
      router.push({ pathname: "/assistant/[tool]", params: { tool: tool.id } });
    else
      router.push({
        pathname: "/record/new",
        params: { tool: tool.id, kind: tool.kind },
      });
  };
  const age = child?.birthday
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(`${child.birthday}T00:00:00`).getTime()) /
            86400000,
        ),
      )
    : null;
  const weeks = child?.due_date
    ? Math.max(
        0,
        Math.floor(
          40 -
            (new Date(`${child.due_date}T00:00:00`).getTime() - Date.now()) /
              604800000,
        ),
      )
    : null;
  const columns = width < 350 || fontScale > 1.3 ? 3 : 4;
  const tools = stage === "born" ? bornTools : pregnancyTools;
  const weight = entries.find((e) => e.kind === "growth" && e.unit === "kg");
  const height = entries.find(
    (e) =>
      e.kind === "growth" &&
      e.unit === "cm" &&
      e.details?.metric !== "Vòng đầu",
  );
  const bmi =
    weight?.amount &&
    height?.amount &&
    weight.occurred_at.slice(0, 10) === height.occurred_at.slice(0, 10)
      ? (weight.amount / (height.amount / 100) ** 2).toFixed(1)
      : "--";
  const tile = (tool: AssistantTool) => (
    <Pressable
      key={tool.id}
      accessibilityRole="button"
      accessibilityLabel={`${editing ? (hidden.includes(tool.id) ? "Hiện " : "Ẩn ") : ""}${tool.title}`}
      onPress={() => open(tool)}
      onLongPress={
        tool.kind && !editing
          ? () =>
              router.push({
                pathname: "/assistant/[tool]",
                params: { tool: tool.id },
              })
          : undefined
      }
      style={({ pressed }) => [
        styles.tile,
        {
          width: `${100 / columns}%`,
          opacity: pressed || (editing && hidden.includes(tool.id)) ? 0.45 : 1,
        },
      ]}
    >
      <AssistantIcon
        tool={tool}
        size={Math.min(60, ((width - 32) / columns) * 0.64)}
      />
      <Text style={styles.tileLabel}>{tool.title}</Text>
      {editing ? (
        <Ionicons
          style={styles.check}
          name={
            hidden.includes(tool.id) ? "ellipse-outline" : "checkmark-circle"
          }
          size={22}
          color="#DC6D86"
        />
      ) : null}
    </Pressable>
  );
  return (
    <Screen
      scroll={false}
      safeAreaStyle={{ backgroundColor: "#7B72BF" }}
      contentStyle={{ padding: 0, paddingTop: 0, gap: 0 }}
    >
      <LinearGradient
        colors={["#7771BC", "#9875CD"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.nav}
      >
        <Pressable
          accessibilityLabel="Cài đặt"
          onPress={() => router.push("/cai-dat")}
          style={styles.navButton}
        >
          <Ionicons name="menu-outline" size={25} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => router.push("/child/edit")}
          style={styles.childPill}
        >
          <Text style={styles.navTitle}>
            Bé {child?.nickname || child?.name || "yêu"}⌄
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Nhắn cho người nhà"
          onPress={() => router.push("/gia-dinh")}
          style={styles.navButton}
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
        </Pressable>
      </LinearGradient>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi ảnh bìa và hồ sơ bé"
          onPress={() => router.push("/child/edit")}
        >
          {child?.cover_path ? (
            <FamilyPhoto path={child.cover_path} style={styles.cover} />
          ) : (
            <Image
              source={require("../../assets/legacy/bg_child_08.png")}
              style={styles.cover}
              resizeMode="stretch"
            />
          )}
          <View style={styles.heroProfile}>
            {child?.avatar_path ? (
              <FamilyPhoto path={child.avatar_path} style={styles.heroAvatar} />
            ) : (
              <Image
                source={require("../../assets/legacy/avatar_male.png")}
                style={styles.heroAvatar}
              />
            )}
            <Text style={styles.heroName}>{child?.name || "Bé yêu"}</Text>
          </View>
          <View style={styles.camera}>
            <Ionicons name="camera" color="#fff" size={18} />
          </View>
        </Pressable>
        <Pressable
          style={styles.profile}
          onPress={() => router.push("/child/edit")}
          accessibilityRole="button"
          accessibilityLabel="Sửa hồ sơ bé"
        >
          <Text style={styles.name}>
            {child?.nickname || child?.name || "Bé yêu"}
          </Text>
          <Text style={styles.age}>
            {stage === "pregnancy"
              ? weeks !== null
                ? `Tuần thai ${weeks} · Đang mong con`
                : "Thêm ngày dự sinh"
              : child?.birthday
                ? `Ngày sinh: ${child.birthday.split("-").reverse().join("/")}`
                : "Thêm ngày sinh của bé"}
          </Text>
          {stage === "born" && age !== null ? (
            <Text style={styles.age}>
              Tuổi:{" "}
              {age < 30
                ? `${age} ngày`
                : age < 365
                  ? `${Math.floor(age / 30.4375)} tháng`
                  : `${Math.floor(age / 365.25)} tuổi ${Math.floor(age / 30.4375) % 12} tháng`}
            </Text>
          ) : null}
        </Pressable>
        {stage === "born" ? (
          <Pressable
            onPress={() => router.push("/child/growth")}
            style={styles.measurements}
          >
            {[
              [`${height?.amount ?? "--"} cm`, "Chiều cao"],
              [`${weight?.amount ?? "--"} kg`, "Cân nặng"],
              [bmi, "BMI"],
            ].map(([value, label]) => (
              <View
                key={label}
                style={{ flex: 1, alignItems: "center", gap: 10 }}
              >
                <Text style={styles.metricLabel}>{label}</Text>
                <Text style={styles.metricValue}>{value}</Text>
              </View>
            ))}
          </Pressable>
        ) : null}
        <View style={styles.segment}>
          {(["pregnancy", "born"] as const).map((v) => (
            <Pressable
              key={v}
              accessibilityRole="tab"
              accessibilityState={{ selected: stage === v }}
              onPress={() => setBranch(v)}
              style={[
                styles.segmentButton,
                stage === v && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  stage === v && styles.segmentSelected,
                ]}
              >
                {v === "pregnancy" ? "Đang mang thai" : "Bé đã sinh"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.divider} />
        <Text style={styles.intro}>
          Theo dõi sự phát triển của bé bằng những tính năng thú vị!
        </Text>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Trợ lí của {child?.nickname || "bé"}
          </Text>
          <Pressable
            disabled={!ready || saving}
            onPress={() =>
              editing ? void savePreferences() : setEditing(true)
            }
            style={styles.smallButton}
          >
            <Text style={styles.action}>
              {saving ? "Đang lưu…" : editing ? "Xong" : "Tùy chỉnh"}
            </Text>
          </Pressable>
        </View>
        {editing ? (
          <Text style={styles.hint}>
            Chạm để ẩn/hiện tiện ích trên máy này, rồi bấm Xong.
          </Text>
        ) : null}
        <View style={styles.grid}>
          {ready ? (
            tools.filter((t) => editing || !hidden.includes(t.id)).map(tile)
          ) : (
            <Text style={styles.hint}>Đang tải tiện ích…</Text>
          )}
        </View>
        {stage === "born" ? (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chỉ số của bé</Text>
              <Pressable
                style={styles.smallButton}
                onPress={() => router.push("/child/growth")}
              >
                <Text style={styles.action}>Xem chi tiết ›</Text>
              </Pressable>
            </View>
            {[
              ["Cân nặng", "kg"],
              ["Chiều dài / chiều cao", "cm"],
              ["Vòng đầu", "cm"],
            ].map(([metric, unit]) => (
              <View
                key={metric}
                style={{
                  padding: 18,
                  borderBottomWidth: 8,
                  borderColor: "#E2E6E8",
                }}
              >
                <GrowthChart entries={entries} metric={metric!} unit={unit!} />
              </View>
            ))}
          </>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chăm sóc sức khỏe</Text>
        </View>
        <View style={styles.grid}>
          {assistantTools
            .filter((t) => ["doctor", "temperature", "medicine"].includes(t.id))
            .map((tool) => (
              <Pressable
                key={tool.id}
                accessibilityRole="button"
                style={[styles.tile, { width: `${100 / columns}%` }]}
                onPress={() =>
                  router.push({
                    pathname: "/record/new",
                    params: { tool: tool.id, kind: tool.kind },
                  })
                }
              >
                <AssistantIcon tool={tool} />
                <Text style={styles.tileLabel}>{tool.title}</Text>
              </Pressable>
            ))}
        </View>
        <Pressable
          onPress={() => router.push("/theo-doi")}
          style={styles.history}
        >
          <Ionicons name="time-outline" size={22} color="#D56783" />
          <View style={{ flex: 1 }}>
            <Text style={styles.historyTitle}>Nhật ký chung của con</Text>
            <Text style={styles.age}>Xem, sửa và theo dõi cùng người nhà</Text>
          </View>
          <Ionicons name="chevron-forward" color="#B8A4AB" size={20} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: {
    padding: 0,
    paddingTop: 0,
    paddingBottom: 28,
    gap: 0,
    backgroundColor: "#fff",
  },
  nav: {
    paddingHorizontal: 8,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navTitle: { fontSize: 17, fontFamily: "QuicksandSemiBold", color: "#fff" },
  childPill: {
    borderWidth: 1,
    borderColor: "#ffffffaa",
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  navActions: { flexDirection: "row" },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cover: { width: "100%", height: 280, backgroundColor: "#579BA9" },
  camera: {
    position: "absolute",
    right: 14,
    top: 12,
    backgroundColor: "#00000040",
    borderRadius: 18,
    padding: 8,
  },
  heroProfile: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    alignItems: "center",
    gap: 10,
  },
  heroAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#F0F1F4",
  },
  heroName: { fontFamily: "QuicksandBold", fontSize: 24, color: "#fff" },
  profile: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 3,
  },
  name: { fontSize: 23, fontFamily: "QuicksandSemiBold", color: "#52A7B0" },
  age: {
    fontSize: 15,
    fontFamily: "Quicksand",
    color: "#303B46",
    marginTop: 3,
  },
  measurements: {
    flexDirection: "row",
    margin: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#EEE",
  },
  metricLabel: {
    fontFamily: "QuicksandSemiBold",
    color: "#303B46",
    fontSize: 15,
  },
  metricValue: { fontFamily: "QuicksandSemiBold", color: "#555", fontSize: 19 },
  intro: {
    textAlign: "center",
    fontFamily: "QuicksandSemiBold",
    fontSize: 17,
    lineHeight: 24,
    color: "#303B46",
    marginHorizontal: 18,
    marginTop: 24,
    marginBottom: 10,
  },
  segment: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 4,
    backgroundColor: "#F8F2F4",
    borderRadius: 12,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: "#fff", elevation: 1 },
  segmentLabel: { color: "#96848C", fontSize: 14, fontWeight: "600" },
  segmentSelected: { color: "#8E70CA" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    minHeight: 44,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "QuicksandSemiBold",
    color: "#303B46",
  },
  smallButton: { minHeight: 44, justifyContent: "center", paddingLeft: 14 },
  action: { color: "#8E70CA", fontSize: 13, fontFamily: "QuicksandSemiBold" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tile: {
    alignItems: "center",
    paddingHorizontal: 3,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 8,
    minHeight: 116,
  },
  tileLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Quicksand",
    color: "#303B46",
    textAlign: "center",
  },
  check: { position: "absolute", right: 8, top: 0 },
  hint: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    color: "#8E7D84",
    fontSize: 13,
  },
  divider: { height: 10, backgroundColor: "#DFE4E6" },
  history: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFF4F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyTitle: { fontSize: 15, color: "#654550", fontWeight: "600" },
});
