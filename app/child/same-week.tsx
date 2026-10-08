import { Stack } from "expo-router";
import { Image, Text } from "react-native";
import { Screen } from "../../src/components/ui";
import images from "../../src/data/legacyImageSources.json";

export default function SameWeekScreen() {
  return (
    <Screen contentStyle={{ paddingTop: 28 }}>
      <Stack.Screen options={{ title: "Bé cùng tuần sinh" }} />
      <Image
        source={images.same_week}
        style={{ width: 100, height: 100, alignSelf: "center" }}
        resizeMode="contain"
      />
      <Text
        style={{
          fontFamily: "QuicksandSemiBold",
          fontSize: 20,
          color: "#303B46",
        }}
      >
        Chưa kết nối cộng đồng của app gốc
      </Text>
      <Text
        style={{
          fontFamily: "Quicksand",
          fontSize: 16,
          lineHeight: 25,
          color: "#626C76",
        }}
      >
        Danh sách bé và bài viết cùng tuần sinh được tải từ máy chủ của Bé của
        mẹ, không nằm sẵn trong IPA. Gia Đình An Nam hiện là không gian riêng
        của gia đình; không lấy tài khoản, bài viết hoặc ảnh của các gia đình
        khác.
      </Text>
    </Screen>
  );
}
