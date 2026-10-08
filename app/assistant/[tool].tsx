import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSQLiteContext } from "expo-sqlite";
import { findAssistantTool, entryToolId } from "../../src/data/assistant";
import { AssistantIcon } from "../../src/components/AssistantIcon";
import { TeethDiagram } from "../../src/components/TeethDiagram";
import { CareTimelineItem } from "../../src/components/CareTimelineItem";
import {
  Card,
  LinkButton,
  PrimaryButton,
  Screen,
} from "../../src/components/ui";
import { useCareHistory } from "../../src/lib/useCareHistory";
import { useApp } from "../../src/providers/AppProvider";
import { makeId } from "../../src/lib/ids";

export default function ToolScreen() {
  const { tool: id } = useLocalSearchParams<{ tool: string }>();
  const tool = findAssistantTool(id);
  const { entries, loading, error, child } = useCareHistory();
  const [limit, setLimit] = useState(30);
  if (!tool?.kind)
    return (
      <Screen>
        <Text>Tiện ích không tồn tại.</Text>
      </Screen>
    );
  const history = entries.filter((entry) => entryToolId(entry) === tool.id);
  const add = (tooth?: string) =>
    router.push({
      pathname: "/record/new",
      params: { tool: tool.id, kind: tool.kind, ...(tooth ? { tooth } : {}) },
    });
  return (
    <Screen>
      <Stack.Screen options={{ title: tool.title }} />
      <View style={styles.header}>
        <AssistantIcon tool={tool} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{tool.title}</Text>
          <Text style={styles.muted}>
            {child?.nickname || child?.name || "Bé yêu"} · Nhật ký chung
          </Text>
        </View>
      </View>
      {tool.id === "kick" && child ? (
        <KickCounter key={child.id} childId={child.id} />
      ) : null}
      {tool.id === "milestones" ? (
        <View style={{ gap: 16 }}>
          <Text style={styles.title}>
            {history.length} kỷ niệm con đã làm được
          </Text>
          <Text style={styles.muted}>
            Chọn nhóm để ghi một cột mốc. Không dùng số lượng kỷ niệm để đánh
            giá mức phát triển của con.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              {
                title: "Vận động",
                image: require("../../assets/legacy/ic_medal_crawling.or8.png"),
                color: "#C95868",
              },
              {
                title: "Tay",
                image: require("../../assets/legacy/ic_medal_hand.or8.png"),
                color: "#91A74A",
              },
              {
                title: "Mắt – nhận thức",
                image: require("../../assets/legacy/ic_medal_eye.or8.png"),
                color: "#8C75A8",
              },
              {
                title: "Ngôn ngữ",
                image: require("../../assets/legacy/ic_medal_talk.or8.png"),
                color: "#559EC0",
              },
              {
                title: "Tương tác",
                image: require("../../assets/legacy/ic_medal_interactive.or8.png"),
                color: "#B6A35F",
              },
            ].map((group) => (
              <Pressable
                key={group.title}
                accessibilityRole="button"
                accessibilityLabel={`Ghi cột mốc ${group.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/record/new",
                    params: { tool: "milestones", category: group.title },
                  })
                }
                style={{
                  width: "47%",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: `${group.color}15`,
                  gap: 8,
                }}
              >
                <Image
                  source={group.image}
                  style={{ width: 90, height: 90 }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    fontFamily: "QuicksandBold",
                    color: group.color,
                    textAlign: "center",
                  }}
                >
                  {group.title}
                </Text>
                <Text style={styles.muted}>
                  {
                    history.filter((e) => e.details?.category === group.title)
                      .length
                  }{" "}
                  kỷ niệm
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {tool.id === "teeth" ? (
        <Card>
          <Text style={styles.title}>Răng sữa của con</Text>
          <Text style={styles.muted}>
            Chọn răng để ghi ngày mọc. Số 1 ở gần giữa miệng, số 5 ở phía trong.
            Trái/phải tính theo phía của bé.
          </Text>
          <TeethDiagram
            records={history}
            onSelect={(tooth, recorded) =>
              recorded
                ? router.push({
                    pathname: "/record/new",
                    params: { id: recorded.id },
                  })
                : add(tooth)
            }
          />
        </Card>
      ) : null}
      {tool.id !== "kick" ? (
        <PrimaryButton
          title={tool.id === "injections" ? "Ghi mũi đã tiêm" : "Thêm ghi nhận"}
          onPress={() => add()}
        />
      ) : (
        <LinkButton title="Nhập số lần bằng tay" onPress={() => add()} />
      )}
      {tool.hint ? <Text style={styles.muted}>{tool.hint}</Text> : null}
      <Text style={styles.title}>Lịch sử ({history.length})</Text>
      {loading ? (
        <Text>Đang tải…</Text>
      ) : error ? (
        <Text>{error}</Text>
      ) : history.length ? (
        <Card>
          {history.slice(0, limit).map((entry) => (
            <CareTimelineItem key={entry.id} entry={entry} />
          ))}
        </Card>
      ) : (
        <Card>
          <Text style={styles.muted}>
            Chưa có ghi nhận. Dữ liệu mới sẽ xuất hiện ở đây và đồng bộ cho
            người nhà.
          </Text>
        </Card>
      )}
      {history.length > limit ? (
        <LinkButton title="Xem thêm" onPress={() => setLimit((n) => n + 30)} />
      ) : null}
      {tool.id === "injections" ? (
        <LinkButton
          title="Nhắc lịch tiêm tiếp theo"
          onPress={() =>
            router.push({
              pathname: "/reminder/new",
              params: { title: "Lịch tiêm của con" },
            })
          }
        />
      ) : null}
    </Screen>
  );
}
type Draft = { id: string; count: number; startedAt: string };
function KickCounter({ childId }: { childId: string }) {
  const { addCare } = useApp();
  const db = useSQLiteContext();
  const key = `kick-draft:${childId}`;
  const [draft, setDraft] = useState<Draft | null>(null);
  const current = useRef<Draft | null>(null);
  const queue = useRef(Promise.resolve());
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((value) => {
        const parsed = value ? JSON.parse(value) : null;
        if (
          parsed &&
          (!Number.isInteger(parsed.count) ||
            parsed.count < 0 ||
            typeof parsed.id !== "string" ||
            !Number.isFinite(Date.parse(parsed.startedAt)))
        )
          throw new Error("Invalid draft");
        if (active) {
          current.current = parsed;
          setDraft(parsed);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setStorageError(true);
      });
    return () => {
      active = false;
    };
  }, [key]);
  const change = (delta: number) => {
    if (!ready || locked.current) return;
    const next = {
      ...(current.current ?? {
        id: makeId("kick"),
        count: 0,
        startedAt: new Date().toISOString(),
      }),
      count: Math.max(0, (current.current?.count ?? 0) + delta),
    };
    current.current = next;
    setDraft(next);
    queue.current = queue.current
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  };
  const save = async () => {
    if (locked.current || !current.current?.count) return;
    locked.current = true;
    setSaving(true);
    try {
      await queue.current;
      const value = current.current;
      const saved = await db.getFirstAsync(
        "SELECT id FROM care_entries WHERE child_id=? AND json_extract(details, '$.sessionId')=?",
        childId,
        value.id,
      );
      if (!saved)
        await addCare({
          kind: "activity",
          amount: value.count,
          unit: "lần",
          occurredAt: value.startedAt,
          details: {
            tool: "kick",
            sessionId: value.id,
            endedAt: new Date().toISOString(),
          },
          note: "Phiên đếm cú đạp",
        });
      await AsyncStorage.removeItem(key);
      current.current = null;
      setDraft(null);
      setStorageError(false);
    } catch {
      Alert.alert("Chưa hoàn tất lưu", "Phiên đếm vẫn được giữ. Hãy thử lại.");
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };
  return (
    <Card>
      <Text style={styles.muted}>
        {draft
          ? `Bắt đầu lúc ${new Date(draft.startedAt).toLocaleTimeString("vi-VN")}`
          : "Chạm mỗi khi bạn muốn ghi nhận một cú đạp"}
      </Text>
      <Pressable
        disabled={!ready || saving}
        accessibilityRole="button"
        accessibilityLabel="Ghi thêm một cú đạp"
        onPress={() => change(1)}
        style={styles.counter}
      >
        <Text style={styles.count}>{draft?.count ?? 0}</Text>
        <Text style={{ color: "#3975BD" }}>Chạm để thêm +1</Text>
      </Pressable>
      <View style={{ gap: 10 }}>
        <LinkButton
          title="Trừ lần chạm nhầm −1"
          disabled={!ready || saving || !draft?.count}
          onPress={() => change(-1)}
        />
        <PrimaryButton
          title={saving ? "Đang lưu…" : "Kết thúc & lưu phiên đếm"}
          disabled={!ready || saving || !draft?.count}
          onPress={save}
        />
      </View>
      {storageError ? (
        <Text style={styles.muted}>
          Chưa lưu được bản nháp trên máy. Không đóng app trước khi lưu phiên
          đếm.
        </Text>
      ) : null}
    </Card>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", gap: 14, alignItems: "center" },
  title: { fontSize: 19, fontWeight: "700", color: "#493940" },
  muted: { color: "#89747E", lineHeight: 21, marginTop: 6 },
  teethRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tooth: {
    minWidth: 46,
    minHeight: 60,
    borderRadius: 14,
    backgroundColor: "#F4F1F2",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  erupted: { backgroundColor: "#FBE7A1" },
  counter: {
    alignSelf: "center",
    marginVertical: 22,
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: "#E5F1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  count: { fontSize: 68, fontWeight: "700", color: "#3975BD" },
});
