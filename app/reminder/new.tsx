import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton, Screen } from '../../src/components/ui';
import { useApp } from '../../src/providers/AppProvider';
import { colors, radius, spacing } from '../../src/theme';

const offsets = [
  { label: '15 phút', minutes: 15 },
  { label: '1 giờ', minutes: 60 },
  { label: 'Tối nay', minutes: 0 },
  { label: 'Ngày mai', minutes: 24 * 60 },
];

export default function NewReminderScreen() {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [selected, setSelected] = useState(1);
  const [saving, setSaving] = useState(false);
  const { addReminder } = useApp();
  const dueAt = useMemo(() => {
    const option = offsets[selected]!;
    if (option.label === 'Tối nay') {
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
      await addReminder({ title: title.trim(), details: details.trim() || null, dueAt });
      router.back();
    } catch (error) {
      Alert.alert('Chưa tạo được', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <Text style={styles.label}>Việc cần nhắc</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Lịch tiêm, mua bỉm, uống thuốc..." placeholderTextColor={colors.inkMuted} style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Thời điểm</Text>
        <View style={styles.options}>
          {offsets.map((option, index) => (
            <Pressable key={option.label} onPress={() => setSelected(index)} style={[styles.option, selected === index && styles.optionActive]}>
              <Text style={[styles.optionText, selected === index && styles.optionTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.preview}>{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(dueAt)}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput value={details} onChangeText={setDetails} multiline placeholder="Ai làm, cần chuẩn bị gì..." placeholderTextColor={colors.inkMuted} style={[styles.input, styles.textarea]} />
      </View>
      <PrimaryButton title={saving ? 'Đang tạo...' : 'Tạo nhắc việc chung'} icon="notifications" onPress={save} disabled={!title.trim() || saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontWeight: '800' },
  input: { minHeight: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, color: colors.ink, fontSize: 16 },
  textarea: { minHeight: 100, paddingTop: spacing.md, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { color: colors.inkMuted, fontWeight: '700' },
  optionTextActive: { color: colors.primary, fontWeight: '900' },
  preview: { color: colors.primary, fontWeight: '800' },
});

