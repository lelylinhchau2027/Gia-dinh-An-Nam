import { useEffect } from "react";
import type { ErrorBoundaryProps } from "expo-router";
import { Pressable, ScrollView, Share, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ERROR_REPORT_KEY = "an-nam:last-render-error";
export function deviceReport() {
  return `Gia Đình An Nam ${Constants.expoConfig?.version ?? "?"}\n${Device.modelName ?? "Thiết bị"} · ${Device.osName ?? "OS"} ${Device.osVersion ?? "?"}`;
}
function safeError(error: Error) {
  return `${error.name}: ${error.message}\n${error.stack ?? ""}`
    .replace(/https?:\/\/[^\s)]+/g, "[URL ẩn]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token ẩn]")
    .slice(0, 5000);
}
export function RecoverableError({ error, retry }: ErrorBoundaryProps) {
  const report = `${deviceReport()}\n${new Date().toISOString()}\n${safeError(error)}`;
  useEffect(() => {
    void AsyncStorage.setItem(ERROR_REPORT_KEY, report).catch(() => undefined);
  }, [error]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: "600" }}>
          Màn hình gặp lỗi
        </Text>
        <Text>
          Dữ liệu đã lưu vẫn được giữ. Bạn có thể thử mở lại màn hình hoặc gửi
          thông tin lỗi để kiểm tra.
        </Text>
        <Text selectable>
          {deviceReport()}\n{safeError(error).split("\n")[0]}
        </Text>
        <Pressable
          style={{ padding: 14, backgroundColor: "#E9E2F5", borderRadius: 10 }}
          onPress={() => void retry()}
        >
          <Text>Thử lại</Text>
        </Pressable>
        <Pressable
          style={{ padding: 14 }}
          onPress={() =>
            void Share.share({ message: report }).catch(() => undefined)
          }
        >
          <Text>Chia sẻ báo cáo lỗi</Text>
        </Pressable>
        <Text style={{ fontSize: 12, color: "#858A91" }}>
          Báo cáo chỉ lưu trên máy, không tự gửi đi. Lỗi native khiến ứng dụng
          tắt hẳn vẫn cần file .ips của iOS.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
