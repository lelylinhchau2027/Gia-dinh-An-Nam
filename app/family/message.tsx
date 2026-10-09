import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { router, Stack, useIsFocused } from "expo-router";
import { HeaderHeightContext } from "expo-router/react-navigation";
import {
  Alert,
  AppState,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/providers/AppProvider";
import { formatDateTime } from "../../src/components/ui";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import {
  MediaViewer,
  type ViewableMedia,
} from "../../src/components/MediaViewer";
import { client } from "../../src/services/social";
import {
  markChatRead,
  partnerReadTime,
  pickChatMedia,
  readChat,
  uploadChatMedia,
} from "../../src/services/chat";
import type { FamilyMessage, MessageAttachment } from "../../src/types";

export default function MessageScreen() {
  const db = useSQLiteContext();
  const {
    family,
    currentUserId,
    messages,
    sendMessage,
    syncNow,
    syncing,
    syncMessage,
  } = useApp();
  const focused = useIsFocused();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [rows, setRows] = useState<FamilyMessage[]>([]);
  const [limit, setLimit] = useState(40);
  const [error, setError] = useState("");
  const [mediaNotice, setMediaNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [peerRead, setPeerRead] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewableMedia | null>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const list = useRef<FlatList<FamilyMessage>>(null);
  const paired = !!family && !family.id.startsWith("family_local");
  const familyId = family?.id;
  const latestIncoming = rows.find((m) => m.created_by !== currentUserId)?.id;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    setRows([]);
    setBody("");
    setAttachments([]);
    setPeerRead(null);
    setLimit(40);
  }, [familyId]);
  useEffect(() => {
    if (!focused || !familyId) return;
    let alive = true;
    readChat(db, familyId, limit)
      .then((result) => {
        if (alive) {
          setRows(result);
          setError("");
        }
      })
      .catch(() => {
        if (alive) setError("Chưa đọc được tin nhắn trên máy.");
      });
    return () => {
      alive = false;
    };
  }, [db, familyId, messages, limit, focused]);
  const refreshRead = useCallback(async () => {
    if (!familyId || !currentUserId || !paired) return;
    try {
      setPeerRead(await partnerReadTime(familyId, currentUserId));
      setMediaNotice("");
    } catch (e) {
      setMediaNotice(
        e instanceof Error ? e.message : "Chưa tải được trạng thái đã đọc.",
      );
    }
  }, [familyId, currentUserId, paired]);
  useEffect(() => {
    if (!focused || !paired || !familyId) return;
    void syncNow();
    void refreshRead();
    const channel = client()
      .channel(`chat-read:${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_message_reads",
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          void refreshRead();
        },
      )
      .subscribe();
    return () => {
      void client()
        .removeChannel(channel)
        .catch(() => undefined);
    };
  }, [focused, paired, familyId, syncNow, refreshRead]);
  useEffect(() => {
    if (focused && active && paired && nearBottom && familyId && latestIncoming)
      void markChatRead(familyId).catch(() => undefined);
  }, [focused, active, paired, nearBottom, familyId, latestIncoming]);
  const addMedia = async (kind: "image" | "video") => {
    if (lock.current) return;
    if (!paired) {
      Alert.alert(
        "Cần ghép gia đình",
        "Ảnh và video cần kết nối gia đình và mạng để tải lên.",
      );
      return;
    }
    if (attachments.length >= 4) {
      Alert.alert("Tối đa 4 tệp mỗi tin nhắn");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await partnerReadTime(familyId!, currentUserId!);
      const asset = await pickChatMedia(kind);
      if (asset) {
        const uploaded = await uploadChatMedia(asset);
        setAttachments((old) => [...old, uploaded]);
      }
    } catch (e) {
      Alert.alert(
        "Chưa thêm được tệp",
        e instanceof Error ? e.message : "Kiểm tra mạng và thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const send = async () => {
    if (lock.current || (!body.trim() && !attachments.length)) return;
    lock.current = true;
    setBusy(true);
    try {
      await sendMessage(body, attachments);
      setBody("");
      setAttachments([]);
      setNearBottom(true);
      list.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e) {
      Alert.alert(
        "Chưa lưu được tin nhắn",
        e instanceof Error ? e.message : "Nội dung vẫn được giữ để thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const bubble = ({ item }: { item: FamilyMessage }) => {
    const mine = item.created_by === currentUserId;
    const read =
      !!peerRead && Date.parse(peerRead) >= Date.parse(item.created_at);
    return (
      <View
        testID={`chat-message-${item.id}`}
        style={[s.bubble, mine ? s.mine : s.theirs]}
      >
        {!mine ? <Text style={s.author}>{item.created_by_name}</Text> : null}
        {item.body ? (
          <Text selectable style={s.body}>
            {item.body}
          </Text>
        ) : null}
        {item.attachments?.map((a) =>
          a.type === "image" ? (
            <FamilyPhoto
              key={a.path}
              path={a.path}
              fullImage
              zoomable
              style={{ width: 230, borderRadius: 10 }}
            />
          ) : (
            <Pressable
              key={a.path}
              accessibilityLabel="Xem video toàn màn hình"
              onPress={() => setViewer(a)}
              style={s.video}
            >
              <Ionicons name="play-circle" color="#8E70CA" size={44} />
              <Text>Video · {(a.size / 1024 / 1024).toFixed(1)} MB</Text>
            </Pressable>
          ),
        )}
        <Text style={s.time}>
          {formatDateTime(item.created_at)}
          {mine
            ? ` · ${item.sync_state !== "synced" ? "Chờ gửi" : read ? "Đã đọc" : "Đã gửi"}`
            : ""}
        </Text>
      </View>
    );
  };
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={s.page}>
      <Stack.Screen
        options={{
          title: "Bố mẹ nhắn tin",
          headerRight: () => (
            <Pressable
              accessibilityLabel="Việc chung"
              onPress={() => router.push("/gia-dinh")}
              style={{ padding: 8 }}
            >
              <Ionicons name="calendar-outline" color="white" size={23} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={s.page}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        {!paired ? (
          <Pressable
            onPress={() => router.push("/family/connect")}
            style={s.notice}
          >
            <Text>Ghép gia đình để gửi tin cho người còn lại →</Text>
          </Pressable>
        ) : null}
        {error || mediaNotice ? (
          <Text style={s.notice}>{error || mediaNotice}</Text>
        ) : null}
        <Pressable onPress={() => void syncNow()} style={s.sync}>
          <Text style={s.time}>
            {syncing
              ? "Đang đồng bộ…"
              : syncMessage || "Tin nhắn được lưu trên máy trước khi gửi"}{" "}
            · Chạm để thử lại
          </Text>
        </Pressable>
        <FlatList
          ref={list}
          data={rows}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={bubble}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={5}
          onScroll={(e) => setNearBottom(e.nativeEvent.contentOffset.y < 80)}
          scrollEventThrottle={100}
          ListEmptyComponent={
            <Text style={{ padding: 20, transform: [{ scaleY: -1 }] }}>
              Chưa có tin nhắn. Gửi lời nhắn đầu tiên nhé.
            </Text>
          }
          ListFooterComponent={
            rows.length >= limit ? (
              <Pressable
                onPress={() => setLimit((n) => n + 40)}
                style={{ padding: 16, alignItems: "center" }}
              >
                <Text style={{ color: "#8E70CA" }}>Xem tin nhắn cũ hơn</Text>
              </Pressable>
            ) : null
          }
        />
        {!nearBottom ? (
          <Pressable
            onPress={() => {
              list.current?.scrollToOffset({ offset: 0, animated: true });
              setNearBottom(true);
            }}
            style={s.sync}
          >
            <Text style={{ color: "#8E70CA" }}>Về tin nhắn mới nhất ↓</Text>
          </Pressable>
        ) : null}
        {attachments.length ? (
          <View style={s.attachments}>
            {attachments.map((a, i) => (
              <Pressable
                key={a.path}
                disabled={busy}
                accessibilityLabel={`Bỏ tệp ${i + 1}`}
                onPress={() =>
                  setAttachments((old) => old.filter((_, j) => j !== i))
                }
                style={s.attachment}
              >
                <Ionicons
                  name={
                    a.type === "image" ? "image-outline" : "videocam-outline"
                  }
                  size={22}
                />
                <Text>{i + 1} ×</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {busy ? (
          <Text style={s.time}>
            Đang xử lý… Vui lòng giữ app mở khi tải tệp.
          </Text>
        ) : null}
        <View style={s.composer}>
          <Pressable
            accessibilityLabel="Gửi ảnh"
            onPress={() => void addMedia("image")}
            disabled={busy}
            style={s.button}
          >
            <Ionicons name="image-outline" color="#8E70CA" size={24} />
          </Pressable>
          <Pressable
            accessibilityLabel="Gửi video"
            onPress={() => void addMedia("video")}
            disabled={busy}
            style={s.button}
          >
            <Ionicons name="videocam-outline" color="#8E70CA" size={24} />
          </Pressable>
          <TextInput
            testID="chat-input"
            accessibilityLabel="Tin nhắn"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            editable={!busy && !!family}
            placeholder="Nhắn cho người nhà…"
            placeholderTextColor="#858A91"
            style={s.input}
          />
          <Pressable
            testID="send-chat"
            accessibilityLabel="Gửi tin nhắn"
            disabled={busy || (!body.trim() && !attachments.length)}
            onPress={() => void send()}
            style={s.button}
          >
            <Ionicons
              name="send"
              color={body.trim() || attachments.length ? "#8E70CA" : "#AAA"}
              size={24}
            />
          </Pressable>
        </View>
        <Pressable
          testID="chat-keyboard-done"
          accessibilityLabel="Ẩn bàn phím"
          onPress={Keyboard.dismiss}
          style={{ alignSelf: "flex-end", padding: 8 }}
        >
          <Text style={s.time}>Xong · Ẩn bàn phím</Text>
        </Pressable>
      </KeyboardAvoidingView>
      <MediaViewer media={viewer} onClose={() => setViewer(null)} />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F5F4F8" },
  notice: {
    padding: 12,
    backgroundColor: "#FFF2D8",
    fontSize: 13,
    color: "#66572E",
  },
  sync: { padding: 8, alignItems: "center" },
  bubble: { maxWidth: "88%", borderRadius: 16, padding: 12, gap: 8 },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: "#E7DDF7",
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
  },
  author: { fontSize: 12, color: "#8E70CA", fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 23, color: "#303B46" },
  time: { fontSize: 11, color: "#727781", lineHeight: 16 },
  video: {
    width: 230,
    height: 138,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F1FA",
    borderRadius: 10,
    gap: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 6,
    gap: 3,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#E5E3E9",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    padding: 10,
    fontSize: 16,
    color: "#303B46",
    backgroundColor: "#F4F3F7",
    borderRadius: 18,
  },
  button: {
    width: 38,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  attachments: { flexDirection: "row", gap: 8, padding: 8 },
  attachment: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#E7DDF7",
    borderRadius: 10,
    gap: 8,
  },
});
