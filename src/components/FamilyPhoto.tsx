import { useEffect, useState } from "react";
import {
  Image,
  Text,
  View,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { photoUrl } from "../services/social";
import { colors } from "../theme";

export function FamilyPhoto({
  path,
  style,
}: {
  path?: string | null;
  style: ViewStyle & ImageStyle;
}) {
  const [uri, setUri] = useState<string | null>(null);
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
  }, [path]);
  return uri ? (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
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
        style,
      ]}
    >
      <Text style={{ color: colors.primary }}>
        {path ? "Ảnh chưa tải được" : "♡"}
      </Text>
    </View>
  );
}
