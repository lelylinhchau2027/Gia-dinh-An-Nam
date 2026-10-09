import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert } from "react-native";
import { FamilyText as Text } from "../../src/components/FamilyText";
import { FormInput } from "../../src/components/FormInput";
import { DayPicker, localDay } from "../../src/components/DayPicker";
import { TimePicker } from "../../src/components/TimePicker";
import { Card, PrimaryButton, Screen } from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
import { enqueue } from "../../src/lib/database";
import { reconcileSyncedReminders } from "../../src/services/notifications";
import { calendarPreview } from "../../src/lib/reminderSchedule";

export default function NewReminderScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    details?: string;
  }>();
  const { addReminder, reminders, refresh, syncNow } = useApp();
  const existing = reminders.find((r) => r.id === params.id);
  const initial = existing
    ? new Date(existing.due_at)
    : new Date(Date.now() + 3600000);
  const db = useSQLiteContext();
  const [title, setTitle] = useState(existing?.title ?? params.title ?? "");
  const [details, setDetails] = useState(
    existing?.details ?? params.details ?? "",
  );
  const [day, setDay] = useState(localDay(initial));
  const [time, setTime] = useState(
    String(initial.getHours()).padStart(2, "0") +
      ":" +
      String(initial.getMinutes()).padStart(2, "0"),
  );
  const [saving, setSaving] = useState(false);
  const dueAt = new Date(day + "T" + time + ":00");
  const save = async () => {
    if (saving || !title.trim()) return;
    if (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now())
      return Alert.alert("Chọn ngày giờ trong tương lai");
    setSaving(true);
    try {
      if (existing) {
        const payload = {
          id: existing.id,
          family_id: existing.family_id,
          title: title.trim(),
          details: details.trim() || null,
          due_at: dueAt.toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.withTransactionAsync(async () => {
          await db.runAsync(
            "UPDATE reminders SET title=?,details=?,due_at=?,updated_at=?,acknowledged_at=NULL,acknowledged_by=NULL,sync_state='pending' WHERE id=?",
            payload.title,
            payload.details,
            payload.due_at,
            payload.updated_at,
            existing.id,
          );
          await enqueue(
            db,
            existing.family_id,
            "reminders",
            existing.id,
            payload,
            "update",
          );
        });
        await reconcileSyncedReminders(db);
        await refresh();
        void syncNow();
      } else
        await addReminder({
          title: title.trim(),
          details: details.trim() || null,
          dueAt,
        });
      router.back();
    } catch (e) {
      Alert.alert(
        "Chưa lưu được",
        e instanceof Error ? e.message : "Hãy thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen>
      <Text>Việc cần nhắc</Text>
      <FormInput
        value={title}
        onChangeText={setTitle}
        maxLength={160}
        placeholder="Lịch tiêm, khám, mua đồ…"
        style={{
          minHeight: 52,
          backgroundColor: "white",
          padding: 14,
          borderRadius: 12,
        }}
      />
      <Text>Ngày hẹn</Text>
      <DayPicker value={day} onChange={setDay} allowFuture />
      <Text>
        Giờ hẹn trên điện thoại (
        {Intl.DateTimeFormat().resolvedOptions().timeZone})
      </Text>
      <TimePicker value={time} onChange={setTime} />
      <Text>Ghi chú riêng trong An Nam</Text>
      <FormInput
        value={details}
        onChangeText={setDetails}
        maxLength={2000}
        multiline
        placeholder="Cần chuẩn bị gì, ai hỗ trợ…"
        style={{
          minHeight: 100,
          padding: 14,
          backgroundColor: "white",
          borderRadius: 12,
        }}
      />
      <Card>
        <Text style={{ fontWeight: "700" }}>Các lượt thông báo dự kiến</Text>
        <Text>
          Khi đồng bộ: Telegram báo người còn lại có lời nhắc mới, kèm nút xác
          nhận. Không gửi nội dung ghi chú sang Telegram.
        </Text>
        {calendarPreview(dueAt).map((line) => (
          <Text key={line}>{line}</Text>
        ))}
        <Text>
          Lịch gửi cho cả hai tài khoản đã liên kết Telegram. Nhắc cục bộ chỉ có
          trên máy đã đồng bộ và cấp quyền. Sửa lời nhắc cần xác nhận lại; máy
          offline có thể còn nhắc giờ cũ.
        </Text>
      </Card>
      <PrimaryButton
        title={
          saving ? "Đang lưu…" : existing ? "Lưu thay đổi" : "Tạo lời nhắc"
        }
        disabled={saving || !title.trim()}
        onPress={save}
      />
    </Screen>
  );
}
