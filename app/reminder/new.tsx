import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { enqueue } from "../../src/lib/database";
import { reconcileSyncedReminders } from "../../src/services/notifications";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PrimaryButton, Screen } from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
import { colors, radius, spacing } from "../../src/theme";

const offsets = [
  { label: "15 phút", minutes: 15 },
  { label: "1 giờ", minutes: 60 },
  { label: "Tối nay", minutes: 0 },
  { label: "Ngày mai", minutes: 24 * 60 },
];

export default function NewReminderScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    details?: string;
  }>();
  const { addReminder, reminders, refresh, syncNow } = useApp();
  const existing = reminders.find((r) => r.id === params.id);
  const db = useSQLiteContext();
  const [title, setTitle] = useState(existing?.title ?? params.title ?? "");
  const [details, setDetails] = useState(
    existing?.details ?? params.details ?? "",
  );
  const localTime = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const [custom, setCustom] = useState(
    existing ? localTime(new Date(existing.due_at)) : "",
  );
  const [selected, setSelected] = useState(1);
  const [saving, setSaving] = useState(false);
  const dueAt = useMemo(() => {
    const option = offsets[selected]!;
    if (option.label === "Tối nay") {
      const date = new Date();
      date.setHours(20, 0, 0, 0);
      if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
      return date;
    }
    return new Date(Date.now() + option.minutes * 60_000);
  }, [selected]);

  const save = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      const selectedDate = custom
        ? new Date(custom.replace(" ", "T") + ":00")
        : dueAt;
      if (
        !Number.isFinite(selectedDate.getTime()) ||
        selectedDate.getTime() <= Date.now() ||
        (custom &&
          (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(custom) ||
            localTime(selectedDate) !== custom))
      )
        throw new Error(
          "Chọn thời điểm hợp lệ ở tương lai, dạng YYYY-MM-DD HH:mm.",
        );
      if (existing) {
        const payload = {
          id: existing.id,
          family_id: existing.family_id,
          title: title.trim(),
          details: details.trim() || null,
          due_at: selectedDate.toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.withTransactionAsync(async () => {
          await db.runAsync(
            "UPDATE reminders SET title=?, details=?, due_at=?, updated_at=?, sync_state='pending' WHERE id=?",
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
          dueAt: selectedDate,
        });
      router.back();
    } catch (error) {
      Alert.alert(
        "Chưa tạo được",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <Text style={styles.label}>Việc cần nhắc</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={160}
          placeholder="Lịch tiêm, mua bỉm, uống thuốc..."
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Thời điểm</Text>
        <View style={styles.options}>
          {offsets.map((option, index) => (
            <Pressable
              key={option.label}
              onPress={() => {
                setSelected(index);
                setCustom("");
              }}
              style={[
                styles.option,
                !custom && selected === index && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected === index && styles.optionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.preview}>
          {new Intl.DateTimeFormat("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(dueAt)}
        </Text>
        <TextInput
          style={styles.input}
          value={custom}
          onChangeText={setCustom}
          placeholder="Hoặc nhập YYYY-MM-DD HH:mm"
          keyboardType="numbers-and-punctuation"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder="Ai làm, cần chuẩn bị gì..."
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, styles.textarea]}
        />
      </View>
      <PrimaryButton
        title={
          saving
            ? "Đang lưu..."
            : existing
              ? "Lưu thay đổi giờ hẹn"
              : "Tạo nhắc việc chung"
        }
        icon="notifications"
        onPress={save}
        disabled={!title.trim() || saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontWeight: "800" },
  input: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: 16,
  },
  textarea: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.inkMuted, fontWeight: "700" },
  optionTextActive: { color: colors.primary, fontWeight: "900" },
  preview: { color: colors.primary, fontWeight: "800" },
});
