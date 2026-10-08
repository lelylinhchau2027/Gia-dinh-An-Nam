import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, PrimaryButton } from '../../src/components/ui';
import { careMeta, quickCareKinds } from '../../src/data/care';
import { useApp } from '../../src/providers/AppProvider';
import { colors, radius, spacing } from '../../src/theme';
import type { CareKind } from '../../src/types';

export default function NewRecordScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = useMemo<CareKind>(
    () => (quickCareKinds.includes(params.kind as CareKind) ? (params.kind as CareKind) : 'milk'),
    [params.kind],
  );
  const meta = careMeta[kind];
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { addCare } = useApp();

  const save = async () => {
    const parsed = amount.trim() ? Number(amount.replace(',', '.')) : null;
    if (amount.trim() && !Number.isFinite(parsed)) {
      Alert.alert('Số lượng chưa đúng', 'Hãy nhập một con số hợp lệ.');
      return;
    }
    try {
      setSaving(true);
      await addCare({
        kind,
        amount: parsed,
        unit: parsed !== null ? meta.defaultUnit ?? null : null,
        note: note.trim() || null,
      });
      router.back();
    } catch (error) {
      Alert.alert('Chưa thể lưu', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { backgroundColor: meta.soft }]}>
        <Text style={[styles.heroLabel, { color: meta.color }]}>{meta.label}</Text>
        <Text style={styles.heroTime}>Bây giờ · {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</Text>
      </View>

      {meta.defaultUnit ? (
        <View style={styles.field}>
          <Text style={styles.label}>Số lượng ({meta.defaultUnit})</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={`Ví dụ: ${kind === 'temperature' ? '37.2' : '120'}`}
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Chi tiết để người còn lại dễ theo dõi..."
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, styles.textarea]}
        />
      </View>
      <PrimaryButton title={saving ? 'Đang lưu...' : 'Lưu vào nhật ký chung'} icon="checkmark" onPress={save} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  hero: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  heroLabel: { fontWeight: '900', fontSize: 28 },
  heroTime: { color: colors.inkMuted },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontWeight: '800' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, minHeight: 52, color: colors.ink, fontSize: 16 },
  textarea: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: 'top' },
});

