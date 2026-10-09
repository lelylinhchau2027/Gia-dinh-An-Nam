import { useRef, useState } from "react";
import { router } from "expo-router";
import { FamilyText as Text } from "../../src/components/FamilyText";
import {
  Card,
  PrimaryButton,
  Screen,
  SectionHeader,
} from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
import { makeId } from "../../src/lib/ids";
import { telegramAction } from "../../src/services/telegram";

export default function AttentionScreen() {
  const { syncNow } = useApp();
  const requestId = useRef(makeId("attention"));
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const send = async () => {
    if (locked.current || sent) return;
    locked.current = true;
    setBusy(true);
    try {
      await telegramAction("attention", { request_id: requestId.current });
      setSent(true);
      setMessage(
        "Đã lưu yêu cầu trên máy chủ, chưa có nghĩa người nhà đã nhận. Xem lời nhắc để chờ xác nhận; liên hệ trực tiếp nếu cần gấp.",
      );
      await syncNow();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Chưa gửi được. Hãy liên hệ trực tiếp.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen>
      <SectionHeader title="Báo bố/mẹ cần hỗ trợ" />
      <Card>
        <Text>Gửi tới người còn lại trong gia đình qua Telegram:</Text>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          “Cần bạn hỗ trợ ngay”
        </Text>
        <Text>
          Không gọi điện. Không gửi vị trí hay hồ sơ bé. Cần Internet, người
          nhận đã liên kết bot và bật thông báo Telegram.
        </Text>
        <Text>
          Đây không phải hệ thống cấp cứu; thông báo có thể bị chậm, tắt tiếng
          hoặc không đến. Khi khẩn cấp hãy gọi trực tiếp hoặc liên hệ dịch vụ
          cấp cứu phù hợp.
        </Text>
      </Card>
      <PrimaryButton
        title={
          busy
            ? "Đang gửi…"
            : sent
              ? "Đã tạo lời nhắc"
              : "Xác nhận gửi báo nhanh"
        }
        disabled={busy || sent}
        onPress={send}
      />
      {!!message && <Text accessibilityRole="alert">{message}</Text>}
      <PrimaryButton
        title="Xem người nhà đã xác nhận chưa"
        onPress={() => router.replace("/gia-dinh")}
      />
    </Screen>
  );
}
