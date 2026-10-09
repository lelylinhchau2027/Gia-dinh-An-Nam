import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Linking } from "react-native";
import { FamilyText as Text } from "../../src/components/FamilyText";
import {
  Card,
  PrimaryButton,
  Screen,
  SectionHeader,
} from "../../src/components/ui";
import { telegramAction, TelegramStatus } from "../../src/services/telegram";

export default function TelegramSettings() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setStatus(await telegramAction<TelegramStatus>("status"));
  }, []);
  useEffect(() => {
    const refresh = () => {
      void load().catch((e) => setMessage(e.message));
    };
    refresh();
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => listener.remove();
  }, [load]);
  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await telegramAction<{ url?: string; accepted?: number }>(
        action,
        extra,
      );
      if (result.url) await Linking.openURL(result.url);
      else
        setMessage(
          action === "test"
            ? (result.accepted ?? 0) > 0
              ? "Telegram đã chấp nhận tin thử. Hãy kiểm tra trên điện thoại."
              : "Tin thử đang chờ gửi; kiểm tra lịch sử bên dưới."
            : "Đã cập nhật.",
        );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Chưa cập nhật được.");
    } finally {
      setBusy(false);
    }
  };
  const link = status?.link;
  return (
    <Screen>
      <SectionHeader title="Telegram của bạn" />
      <Card>
        <Text>
          Bot chỉ gửi lời báo tổng quát và thời gian lịch. Không chuyển ảnh, tên
          bé, số đo, thuốc hay nội dung ghi chú sang Telegram. Cần mạng và bật
          thông báo Telegram; không bảo đảm đến tức thì.
        </Text>
      </Card>
      <Card>
        <Text>
          {link
            ? `${link.display_name} · ${!link.confirmed_at ? "Chờ bạn xác nhận" : link.enabled ? "Đang bật" : "Tạm dừng"}`
            : "Chưa liên kết"}
        </Text>
        {!link && (
          <PrimaryButton
            title="Đồng ý và mở bot để liên kết"
            disabled={busy}
            onPress={() => void run("start")}
          />
        )}
        {link && !link.confirmed_at && (
          <PrimaryButton
            title={`Xác nhận đây là Telegram của tôi: ${link.display_name}`}
            disabled={busy}
            onPress={() =>
              void run("confirm", { link_version: link.updated_at })
            }
          />
        )}
        {!!link?.confirmed_at && (
          <>
            <PrimaryButton
              title="Gửi tin thử về Telegram của tôi"
              disabled={busy || !link.enabled}
              onPress={() => void run("test")}
            />
            <PrimaryButton
              title={link.enabled ? "Tạm dừng Telegram" : "Bật lại Telegram"}
              disabled={busy}
              onPress={() => void run(link.enabled ? "pause" : "resume")}
            />
          </>
        )}
        {link && (
          <PrimaryButton
            title="Hủy liên kết"
            disabled={busy}
            onPress={() =>
              Alert.alert(
                "Hủy liên kết?",
                "Ngừng các lượt chưa gửi đến Telegram này.",
                [
                  { text: "Giữ lại", style: "cancel" },
                  {
                    text: "Hủy liên kết",
                    style: "destructive",
                    onPress: () => void run("unlink"),
                  },
                ],
              )
            }
          />
        )}
        <PrimaryButton
          title="Tải lại trạng thái sau khi bấm Start"
          disabled={busy}
          onPress={() => void load().catch((e) => setMessage(e.message))}
        />
        {!!message && <Text accessibilityRole="alert">{message}</Text>}
      </Card>
      <SectionHeader title="Các lượt gửi gần đây của bạn" />
      <Text>
        “Telegram đã nhận” chỉ xác nhận máy chủ Telegram chấp nhận, không chứng
        minh điện thoại đã hiện banner. Nút “Tôi đã nhận” mới là phản hồi của
        người nhận.
      </Text>
      {status?.jobs.map((job, i) => (
        <Card key={i}>
          <Text>
            {new Date(job.created_at).toLocaleString("vi-VN")} ·{" "}
            {
              (
                {
                  accepted: "Telegram đã nhận",
                  pending: "Chờ gửi",
                  processing: "Đang gửi",
                  failed: "Lỗi gửi",
                  cancelled: "Đã hủy",
                  expired: "Hết hạn",
                } as Record<string, string>
              )[job.state]
            }
          </Text>
          {job.last_error && (
            <Text>Kiểm tra kết nối bot / cấu hình máy chủ.</Text>
          )}
        </Card>
      ))}
    </Screen>
  );
}
