import { router, useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import { AssistantIcon } from "../../src/components/AssistantIcon";
import {
  assistantTools,
  bornTools,
  pregnancyTools,
  type AssistantTool,
} from "../../src/data/assistant";
import images from "../../src/data/legacyImageSources.json";
import { useApp } from "../../src/providers/AppProvider";
export { RecoverableError as ErrorBoundary } from "../../src/components/RecoverableError";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { GrowthChart } from "../../src/components/GrowthChart";

export default function BabyScreen() {
  const { child, children, selectChild } = useApp();
  const { entries } = useCareHistory();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [branch, setBranch] = useState<"pregnancy" | "born" | null>(null);
  useEffect(() => {
    setBranch(null);
  }, [child?.id]);
  const [sheet, setSheet] = useState<"profile" | "tools" | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [hiddenDraft, setHiddenDraft] = useState<string[]>([]);
  const [loadedPreferenceKey, setLoadedPreferenceKey] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const stage =
    branch ?? (child?.due_date && !child.birthday ? "pregnancy" : "born");
  const preferenceKey = `assistant-tools:${child?.id ?? "local"}:${stage}`;
  // The previous key can finish loading before the child's profile arrives.
  // Only allow edits after preferences for the actual child/stage are loaded.
  const ready = !!child && loadedPreferenceKey === preferenceKey;
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(preferenceKey)
      .then((value) => {
        const saved: unknown = value ? JSON.parse(value) : [];
        if (active)
          setHidden(
            Array.isArray(saved)
              ? saved.filter((v): v is string => typeof v === "string")
              : [],
          );
      })
      .catch(() => {
        if (active) setHidden([]);
      })
      .finally(() => {
        if (active) setLoadedPreferenceKey(preferenceKey);
      });
    return () => {
      active = false;
    };
  }, [preferenceKey]);
  const savePreferences = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem(preferenceKey, JSON.stringify(hiddenDraft));
      setHidden(hiddenDraft);
      setSheet(null);
    } catch {
      Alert.alert("Chưa lưu được", "Hãy thử lại để lưu các tiện ích đã chọn.");
    } finally {
      setSaving(false);
    }
  };
  const open = (tool: AssistantTool) => {
    if (tool.route)
      router.push({
        pathname: tool.route as never,
        params: tool.section
          ? tool.id === "injections"
            ? { mode: tool.section }
            : { section: tool.section }
          : {},
      });
    else
      router.push({ pathname: "/assistant/[tool]", params: { tool: tool.id } });
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
  const columns = fontScale > 1.4 ? 3 : 4;
  const coverHeight = Math.max(290, Math.min(width * 0.88, 430));
  const headerOpacity = scrollY.interpolate({
    inputRange: [coverHeight - 120, coverHeight - 65],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const expandedOpacity = scrollY.interpolate({
    inputRange: [20, coverHeight - 100],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const iconSize = Math.min((width - 32) / columns / 1.6, 90);
  const nickname = child?.nickname || child?.name || "Bé yêu";
  const title = (tool: AssistantTool) =>
    tool.id === "statistics"
      ? `Thống kê vui bé ${child?.birthday?.slice(0, 4) || new Date().getFullYear()}`
      : tool.title;
  const avatar = (size: number) =>
    child?.avatar_path ? (
      <FamilyPhoto
        path={child.avatar_path}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    ) : (
      <Image
        source={images.avatar_male}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  return (
    <SafeAreaView edges={["left", "right"]} style={s.root}>
      {focused ? <StatusBar style="light" /> : null}
      <Animated.ScrollView
        testID="assistant-scroll"
        style={s.scroll}
        contentContainerStyle={s.page}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <View style={{ height: coverHeight }}>
          <Pressable
            accessibilityLabel="Đổi ảnh bìa"
            onPress={() => router.push("/child/edit")}
            style={StyleSheet.absoluteFill}
          >
            {child?.cover_path ? (
              <FamilyPhoto
                path={child.cover_path}
                style={{ width: "100%", height: coverHeight }}
              />
            ) : (
              <Image
                source={images.bg_child_08}
                style={{ width: "100%", height: coverHeight }}
                resizeMode="stretch"
              />
            )}
          </Pressable>
          {child?.cover_path ? (
            <Svg
              pointerEvents="none"
              width="100%"
              height={70}
              viewBox="0 0 390 70"
              preserveAspectRatio="none"
              style={s.coverCurve}
            >
              <Path
                d="M0 0 Q95 -6 195 68 Q290 -6 390 0 L390 70 H0Z"
                fill="#fff"
              />
            </Svg>
          ) : null}
        </View>
        <View style={s.heroProfile}>
          <Pressable
            onPress={() => setSheet("profile")}
            accessibilityLabel="Hồ sơ và giai đoạn của bé"
            style={s.avatarFrame}
          >
            {avatar(114)}
            <View style={s.avatarArrow}>
              <Ionicons name="chevron-down" color="#fff" size={24} />
            </View>
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel="Sửa hồ sơ bé"
          onPress={() => router.push("/child/edit")}
          style={s.profile}
        >
          <Text style={s.name}>{nickname}</Text>
          <Text style={s.description}>
            {stage === "pregnancy"
              ? weeks === null
                ? "Thêm ngày dự sinh"
                : `Tuần thai ${weeks}`
              : child?.birthday
                ? `Ngày sinh: ${child.birthday.split("-").reverse().join("/")}`
                : "Thêm ngày sinh của bé"}
          </Text>
          {stage === "born" && age !== null ? (
            <Text style={s.description}>
              Tuổi:{" "}
              {age < 30
                ? `${age} ngày`
                : age < 365
                  ? `${Math.floor(age / 30.4375)} tháng`
                  : `${Math.floor(age / 365.25)} tuổi ${Math.floor(age / 30.4375) % 12} tháng`}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi bé hoặc thêm bé"
          testID="choose-child"
          onPress={() => setSheet("profile")}
          style={{
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 12,
          }}
        >
          <Ionicons name="people-outline" color="#8E70CA" size={20} />
          <Text style={{ fontFamily: "QuicksandSemiBold", color: "#8E70CA" }}>
            Đổi bé · {children.length} hồ sơ
          </Text>
          <Ionicons name="chevron-down" color="#8E70CA" size={16} />
        </Pressable>
        {stage === "born" ? (
          <Pressable
            accessibilityLabel="Xem chỉ số của bé"
            onPress={() => router.push("/child/growth")}
            style={s.measurements}
          >
            {[
              ["height", `${height?.amount ?? "--"} cm`],
              ["weight", `${weight?.amount ?? "--"} kg`],
              ["bmi", bmi],
            ].map(([id, value]) => (
              <View key={id} style={s.metric}>
                {id === "bmi" ? (
                  <Text style={s.metricHeading}>BMI</Text>
                ) : (
                  <MaterialCommunityIcons
                    name={id === "height" ? "ruler" : "scale-bathroom"}
                    color="#303B46"
                    size={25}
                  />
                )}
                <Text style={s.metricValue}>{value}</Text>
              </View>
            ))}
          </Pressable>
        ) : null}
        <View style={s.divider} />
        <Text style={s.intro}>
          Theo dõi sự phát triển của bé bằng những tính năng thú vị!
        </Text>
        <View style={s.grid}>
          {ready ? (
            tools
              .filter((t) => !hidden.includes(t.id))
              .map((tool) => (
                <Pressable
                  key={tool.id}
                  testID={`tool-${tool.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={title(tool)}
                  onPress={() => open(tool)}
                  onLongPress={
                    tool.kind
                      ? () =>
                          router.push({
                            pathname: "/record/new",
                            params: { tool: tool.id, kind: tool.kind },
                          })
                      : undefined
                  }
                  style={({ pressed }) => [
                    s.tile,
                    { width: `${100 / columns}%`, opacity: pressed ? 0.5 : 1 },
                  ]}
                >
                  <AssistantIcon tool={tool} size={iconSize} />
                  <Text style={s.tileLabel}>{title(tool)}</Text>
                </Pressable>
              ))
          ) : (
            <Text style={s.muted}>Đang tải tiện ích…</Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Khác, chọn tiện ích"
            disabled={!ready}
            onPress={() => {
              setHiddenDraft(hidden);
              setSheet("tools");
            }}
            style={[s.tile, { width: `${100 / columns}%` }]}
          >
            <View
              style={{
                width: iconSize,
                height: iconSize,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="ellipsis-horizontal" color="#7E8790" size={32} />
            </View>
            <Text style={s.tileLabel}>Khác</Text>
          </Pressable>
        </View>
        {stage === "born" ? (
          <>
            {[
              ["Cân nặng", "kg"],
              ["Chiều dài / chiều cao", "cm"],
              ["Vòng đầu", "cm"],
            ].map(([metric, unit]) => (
              <View key={metric}>
                <View style={s.divider} />
                <Pressable
                  accessibilityLabel={`Chi tiết ${metric}`}
                  onPress={() => router.push("/child/growth")}
                  style={s.chart}
                >
                  <GrowthChart
                    entries={entries}
                    metric={metric!}
                    unit={unit!}
                  />
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
      </Animated.ScrollView>
      <View
        style={[s.nav, { height: insets.top + 52, paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}
        >
          <LinearGradient colors={["#7771BC", "#9875CD"]} style={s.scroll} />
        </Animated.View>
        <Pressable
          accessibilityLabel="Cài đặt"
          onPress={() => router.push("/cai-dat")}
          style={s.navButton}
        >
          <Ionicons name="menu-outline" color="#fff" size={28} />
        </Pressable>
        <Animated.View style={{ opacity: headerOpacity }}>
          <Pressable
            style={s.childPill}
            onPress={() => setSheet("profile")}
            accessibilityLabel="Chọn hồ sơ bé"
          >
            {avatar(27)}
            <Text style={s.navTitle}>{nickname}</Text>
            <Ionicons name="chevron-down" color="#fff" size={15} />
          </Pressable>
        </Animated.View>
        <Pressable
          accessibilityLabel="Nhắn cho người nhà"
          onPress={() => router.push("/family/message")}
          style={s.navButton}
        >
          <Ionicons name="chatbubbles-outline" color="#fff" size={26} />
          <Animated.View
            pointerEvents="none"
            style={[s.chatCircle, { opacity: expandedOpacity }]}
          >
            <Ionicons name="chatbubbles-outline" color="#A0A0A0" size={27} />
          </Animated.View>
        </Pressable>
      </View>
      <Modal
        transparent
        visible={sheet !== null}
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        <View style={s.scrim}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Đóng"
            onPress={() => setSheet(null)}
          />
          <View
            style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <View style={s.sheetHeading}>
              <Text style={s.sheetTitle}>
                {sheet === "profile" ? nickname : "Các tiện ích của bé"}
              </Text>
              <Pressable
                accessibilityLabel="Đóng"
                onPress={() => setSheet(null)}
                style={s.navButton}
              >
                <Ionicons name="close" size={25} color="#303B46" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {sheet === "profile" ? (
                <>
                  {children.map((baby) => (
                    <Pressable
                      key={baby.id}
                      accessibilityLabel={`Chọn bé ${baby.nickname || baby.name}`}
                      testID={`choose-child-${baby.id}`}
                      style={s.sheetRow}
                      onPress={() => {
                        void selectChild(baby.id)
                          .then(() => setSheet(null))
                          .catch(() =>
                            Alert.alert(
                              "Chưa chuyển được hồ sơ",
                              "Hãy thử lại.",
                            ),
                          );
                      }}
                    >
                      <Text style={[s.rowText, { flex: 1 }]}>
                        {baby.nickname || baby.name}
                      </Text>
                      <Ionicons
                        name={
                          baby.id === child?.id
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={24}
                        color="#8E70CA"
                      />
                    </Pressable>
                  ))}
                  <Pressable
                    testID="add-child"
                    style={s.sheetRow}
                    onPress={() => {
                      setSheet(null);
                      router.push({
                        pathname: "/child/edit",
                        params: { mode: "new" },
                      });
                    }}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={25}
                      color="#8E70CA"
                    />
                    <Text style={s.rowText}>Thêm bé vào gia đình</Text>
                  </Pressable>
                  <Pressable
                    style={s.sheetRow}
                    onPress={() => {
                      setSheet(null);
                      router.push("/child/edit");
                    }}
                  >
                    <Text style={s.rowText}>
                      Hồ sơ, ảnh đại diện và ảnh bìa
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#8E70CA"
                    />
                  </Pressable>
                  {(["pregnancy", "born"] as const).map((value) => (
                    <Pressable
                      key={value}
                      style={s.sheetRow}
                      onPress={() => {
                        setBranch(value);
                        setSheet(null);
                      }}
                    >
                      <Text style={s.rowText}>
                        {value === "pregnancy"
                          ? "Đang mang thai"
                          : "Bé đã sinh"}
                      </Text>
                      <Ionicons
                        name={
                          stage === value
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        color="#8E70CA"
                        size={24}
                      />
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  <Text style={s.muted}>
                    Chọn các mục hiện trên màn hình Trợ lí. Nhấn giữ một tiện
                    ích để ghi nhanh.
                  </Text>
                  {tools.map((tool) => (
                    <Pressable
                      key={tool.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Hiện ${tool.title}`}
                      aria-checked={!hiddenDraft.includes(tool.id)}
                      accessibilityState={{
                        checked: !hiddenDraft.includes(tool.id),
                      }}
                      testID={`toggle-tool-${tool.id}`}
                      style={s.sheetRow}
                      onPress={() =>
                        setHiddenDraft((ids) =>
                          ids.includes(tool.id)
                            ? ids.filter((id) => id !== tool.id)
                            : [...ids, tool.id],
                        )
                      }
                    >
                      <AssistantIcon tool={tool} size={40} />
                      <Text style={[s.rowText, { flex: 1 }]}>{tool.title}</Text>
                      <Ionicons
                        name={
                          hiddenDraft.includes(tool.id)
                            ? "ellipse-outline"
                            : "checkmark-circle"
                        }
                        size={24}
                        color="#8E70CA"
                      />
                    </Pressable>
                  ))}
                  <Text style={[s.sheetTitle, { margin: 16 }]}>
                    Tiện ích khác
                  </Text>
                  {assistantTools
                    .filter((t) =>
                      ["doctor", "temperature", "medicine", "mom"].includes(
                        t.id,
                      ),
                    )
                    .map((tool) => (
                      <Pressable
                        key={tool.id}
                        style={s.sheetRow}
                        onPress={() => {
                          setSheet(null);
                          open(tool);
                        }}
                      >
                        <AssistantIcon tool={tool} size={40} />
                        <Text style={[s.rowText, { flex: 1 }]}>
                          {tool.title}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          color="#8E70CA"
                          size={20}
                        />
                      </Pressable>
                    ))}
                </>
              )}
            </ScrollView>
            {sheet === "tools" ? (
              <Pressable
                disabled={saving || !ready}
                testID="save-tool-preferences"
                style={s.saveButton}
                onPress={() => void savePreferences()}
              >
                <Text style={s.saveLabel}>{saving ? "Đang lưu…" : "Xong"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  page: { paddingBottom: 24 },
  coverCurve: { position: "absolute", bottom: -1 },
  heroProfile: {
    marginTop: -64,
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
  },
  avatarFrame: { borderWidth: 3, borderColor: "#fff", borderRadius: 64 },
  avatarArrow: {
    position: "absolute",
    bottom: -1,
    right: -3,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E70CA",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 18,
  },
  heroName: { fontFamily: "QuicksandBold", fontSize: 24, color: "#fff" },
  profile: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  name: {
    fontFamily: "QuicksandSemiBold",
    color: "#52A7B0",
    fontSize: 24,
    marginBottom: 5,
  },
  description: {
    fontFamily: "Quicksand",
    color: "#303B46",
    fontSize: 15,
    lineHeight: 21,
  },
  measurements: {
    marginHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderColor: "#F0F1F4",
    flexDirection: "row",
  },
  metric: { flex: 1, alignItems: "center", gap: 12 },
  metricHeading: {
    fontFamily: "QuicksandBold",
    fontSize: 17,
    height: 25,
    color: "#303B46",
  },
  metricValue: { fontFamily: "QuicksandSemiBold", fontSize: 20, color: "#555" },
  divider: { height: 12, backgroundColor: "#DDE3E5" },
  intro: {
    fontFamily: "QuicksandSemiBold",
    color: "#303B46",
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    marginHorizontal: 12,
    marginTop: 32,
    marginBottom: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tile: {
    alignItems: "center",
    paddingHorizontal: 3,
    paddingBottom: 24,
    gap: 10,
    minHeight: 118,
  },
  tileLabel: {
    fontFamily: "Quicksand",
    fontSize: 15,
    lineHeight: 19,
    color: "#303B46",
    textAlign: "center",
  },
  chart: { padding: 20 },
  nav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  childPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF80",
    borderRadius: 22,
    padding: 4,
    paddingRight: 10,
  },
  navTitle: { color: "#fff", fontFamily: "QuicksandSemiBold", fontSize: 16 },
  chatCircle: {
    position: "absolute",
    width: 56,
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  scrim: { flex: 1, backgroundColor: "#00000055", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  sheetHeading: {
    paddingLeft: 20,
    paddingRight: 8,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontFamily: "QuicksandSemiBold",
    fontSize: 19,
    color: "#303B46",
  },
  sheetRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E9ED",
  },
  rowText: {
    fontFamily: "Quicksand",
    color: "#303B46",
    fontSize: 16,
    flexShrink: 1,
  },
  muted: {
    color: "#858A91",
    fontFamily: "Quicksand",
    fontSize: 14,
    lineHeight: 21,
    padding: 16,
  },
  saveButton: {
    backgroundColor: "#8E70CA",
    margin: 16,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  saveLabel: { fontFamily: "QuicksandSemiBold", color: "#fff", fontSize: 17 },
});
