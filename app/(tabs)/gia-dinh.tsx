import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { FamilyText as Text } from "../../src/components/FamilyText";
import { AppTitle } from "../../src/components/AppTitle";
import {
  Card,
  PrimaryButton,
  Screen,
  SectionHeader,
  formatDateTime,
} from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
import { telegramAction } from "../../src/services/telegram";

export default function FamilyScreen() {
  const { family, reminders, currentUserId, completeReminder, syncNow } =
    useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const action = async (id: string, work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(id);
    try {
      await work();
      await syncNow();
    } catch (e) {
      Alert.alert(
        "Chưa cập nhật được",
        e instanceof Error ? e.message : "Hãy kiểm tra mạng.",
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen>
      <AppTitle
        eyebrow={family?.name ?? "Gia đình"}
        title="Lời nhắc của hai người"
        subtitle="Giao việc rõ ràng · xác nhận đã nhận · cùng theo dõi đến khi hoàn thành"
      />
      <PrimaryButton
        title="Tạo lời nhắc"
        icon="add-circle-outline"
        onPress={() => router.push("/reminder/new")}
      />
      <PrimaryButton
        title="Báo người nhà: cần hỗ trợ ngay"
        icon="alert-circle-outline"
        onPress={() => router.push("/family/attention")}
      />
      <PrimaryButton
        title="Liên kết / kiểm tra Telegram"
        onPress={() => router.push("/family/telegram")}
      />
      <SectionHeader title="Lời nhắc & lịch gia đình" />
      {!reminders.length && (
        <Card>
          <Text>
            Chưa có lời nhắc. Tạo lịch hoặc việc cần người còn lại hỗ trợ.
          </Text>
        </Card>
      )}
      {reminders.map((r) => (
        <Card key={r.id}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>{r.title}</Text>
          <Text>
            {formatDateTime(r.due_at)} · {r.created_by_name}
          </Text>
          {!!r.details && <Text>{r.details}</Text>}
          <Text>
            {r.sync_state === "pending"
              ? "Đang chờ đồng bộ — chưa báo người nhà"
              : r.acknowledged_at
                ? "Đã nhận lúc " + formatDateTime(r.acknowledged_at)
                : "Chưa được người còn lại xác nhận"}
          </Text>
          <Text>
            {r.completed_at
              ? "Đã hoàn thành · " + formatDateTime(r.completed_at)
              : "Chưa hoàn thành"}
          </Text>
          {!r.completed_at && (
            <View style={{ gap: 8 }}>
              {r.created_by !== currentUserId && !r.acknowledged_at && (
                <PrimaryButton
                  title="Tôi đã nhận lời nhắc"
                  disabled={!!busy || r.sync_state === "pending"}
                  onPress={() =>
                    void action(r.id, () =>
                      telegramAction("acknowledge", {
                        id: r.id,
                        revision: r.schedule_version ?? 1,
                      }),
                    )
                  }
                />
              )}
              <PrimaryButton
                title="Đánh dấu đã hoàn thành"
                disabled={!!busy}
                onPress={() =>
                  Alert.alert(
                    "Đã hoàn thành?",
                    "Chỉ chọn khi việc thực sự đã làm xong. Các lượt nhắc tương lai sẽ dừng.",
                    [
                      { text: "Chưa", style: "cancel" },
                      {
                        text: "Đã xong",
                        onPress: () =>
                          void action(r.id, () => completeReminder(r)),
                      },
                    ],
                  )
                }
              />
              {r.reminder_kind !== "attention" && (
                <PrimaryButton
                  title="Sửa lời nhắc / giờ hẹn"
                  onPress={() =>
                    router.push({
                      pathname: "/reminder/new",
                      params: { id: r.id },
                    })
                  }
                />
              )}
            </View>
          )}
        </Card>
      ))}
      <PrimaryButton
        title="Ghép hai thiết bị"
        icon="link-outline"
        onPress={() => router.push("/family/connect")}
      />
    </Screen>
  );
}
