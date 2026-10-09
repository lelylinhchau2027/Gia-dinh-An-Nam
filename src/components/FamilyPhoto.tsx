import { useEffect, useState } from "react";
import {
  Image,
  Text,
  View,
  Pressable,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { photoUrl } from "../services/social";
import { colors } from "../theme";
import { MediaViewer } from "./MediaViewer";

export function FamilyPhoto({
  path,
  style,
  fullImage = false,
  zoomable = false,
}: {
  path?: string | null;
  style: ViewStyle & ImageStyle;
  fullImage?: boolean;
  zoomable?: boolean;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [ratio, setRatio] = useState(1);
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setUri(null);
    const load = () => {
      if (path)
        photoUrl(path)
          .then((url) => {
            if (active) setUri(url);
          })
          .catch(() => {
            if (active) setUri(null);
          });
    };
    load();
    const timer = setInterval(load, 50 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [path, retry]);
  const imageStyle = fullImage
    ? {
        ...style,
        height: undefined,
        aspectRatio: Math.max(0.2, Math.min(5, ratio)),
      }
    : style;
  const content = uri ? (
    <Image
      source={{ uri }}
      style={imageStyle}
      resizeMode={fullImage ? "contain" : "cover"}
      onLoad={(event) => {
        const { width, height } = event.nativeEvent.source;
        if (width > 0 && height > 0) setRatio(width / height);
      }}
      onError={() => setUri(null)}
    />
  ) : (
    <View
      style={[
        {
          backgroundColor: colors.primarySoft,
          justifyContent: "center",
          alignItems: "center",
        },
        imageStyle,
      ]}
    >
      <Text style={{ color: colors.primary }}>
        {path ? "Ảnh chưa tải được" : "♡"}
      </Text>
    </View>
  );
  if (!zoomable) return content;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem ảnh toàn màn hình"
        onPress={() => {
          if (uri) setOpen(true);
          else setRetry((v) => v + 1);
        }}
      >
        {content}
      </Pressable>
      <MediaViewer
        media={open && path ? { path, type: "image" } : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
