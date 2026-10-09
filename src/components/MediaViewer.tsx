import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { photoUrl } from "../services/social";

export type ViewableMedia = { path: string; type: "image" | "video" };

export function MediaViewer({
  media,
  onClose,
}: {
  media: ViewableMedia | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!media}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {media ? (
        <ViewerContent key={media.path} media={media} onClose={onClose} />
      ) : null}
    </Modal>
  );
}
function ViewerContent({
  media,
  onClose,
}: {
  media: ViewableMedia;
  onClose: () => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    let active = true;
    setError("");
    setUri(null);
    photoUrl(media.path)
      .then((url) => {
        if (active) setUri(url);
      })
      .catch(() => {
        if (active)
          setError(
            "Chưa tải được tệp. Kiểm tra kết nối hoặc quyền truy cập gia đình.",
          );
      });
    return () => {
      active = false;
    };
  }, [media.path, attempt]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#101015" }}>
      <View
        style={{
          height: 50,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: "white", flex: 1, paddingRight: 8 }}>
          {media.type === "image"
            ? "Ảnh gia đình · Chụm hai ngón để phóng to"
            : "Video gia đình"}
        </Text>
        <Pressable
          accessibilityLabel="Đóng toàn màn hình"
          testID="close-media-viewer"
          onPress={onClose}
          style={{ padding: 10 }}
        >
          <Ionicons name="close" color="white" size={26} />
        </Pressable>
      </View>
      {error ? (
        <View style={{ padding: 24, gap: 20 }}>
          <Text style={{ color: "white" }}>{error}</Text>
          <Pressable onPress={() => setAttempt((v) => v + 1)}>
            <Text style={{ color: "#C3ACEF" }}>Thử tải lại</Text>
          </Pressable>
        </View>
      ) : !uri ? (
        <ActivityIndicator style={{ flex: 1 }} color="white" />
      ) : media.type === "video" ? (
        <FullVideo uri={uri} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          minimumZoomScale={1}
          maximumZoomScale={4}
          centerContent
          bouncesZoom
        >
          <Image
            source={{ uri }}
            style={{ width, height: Math.max(200, height - 150) }}
            resizeMode="contain"
            onError={() => setError("Ảnh không tải được. Hãy thử lại.")}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
function FullVideo({ uri }: { uri: string }) {
  // Only instantiate the native decoder while this full-screen view is open.
  const player = useVideoPlayer(uri);
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  });
  return (
    <View style={{ flex: 1 }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
      />
      {status === "error" ? (
        <Text style={{ color: "white", padding: 16 }}>
          Video chưa phát được:{" "}
          {error?.message || "Định dạng chưa được hỗ trợ trên thiết bị này."}
        </Text>
      ) : null}
    </View>
  );
}
