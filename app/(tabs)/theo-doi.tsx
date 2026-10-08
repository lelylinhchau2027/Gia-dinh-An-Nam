import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTitle } from '../../src/components/AppTitle';
import { CareTimelineItem } from '../../src/components/CareTimelineItem';
import { Card, EmptyState, Screen, SectionHeader } from '../../src/components/ui';
import { careMeta, quickCareKinds } from '../../src/data/care';
import { useApp } from '../../src/providers/AppProvider';
import { colors, radius, spacing } from '../../src/theme';
import type { CareKind } from '../../src/types';

export default function TrackingScreen() {
  const { entries } = useApp();
  const today = new Date().toDateString();
  const todayEntries = entries.filter(
    (entry) => new Date(entry.occurred_at).toDateString() === today,
  );
  const total = (kind: CareKind) =>
    todayEntries
      .filter((entry) => entry.kind === kind)
      .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

  return (
    <Screen>
      <AppTitle
        eyebrow="Nhật ký của bé"
        title="Theo dõi hôm nay"
        subtitle="Mọi cập nhật của hai người xuất hiện chung trên cùng một dòng thời gian."
      />

      <View style={styles.summaryRow}>
        <Summary label="Sữa" value={`${total('milk')} ml`} color={colors.blueSoft} />
        <Summary label="Ngủ" value={`${total('sleep')} phút`} color={colors.lavenderSoft} />
        <Summary
          label="Bỉm"
          value={`${todayEntries.filter((item) => item.kind === 'diaper').length} lần`}
          color={colors.amberSoft}
        />
      </View>

      <SectionHeader title="Thêm hoạt động" />
      <View style={styles.kindRow}>
        {quickCareKinds.map((kind) => {
          const meta = careMeta[kind];
          return (
            <Pressable
              key={kind}
              onPress={() => router.push({ pathname: '/record/new', params: { kind } })}
              style={styles.kindButton}
            >
              <Ionicons name={meta.icon} size={20} color={meta.color} />
              <Text style={styles.kindLabel}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Dòng thời gian" />
      <Card>
        {entries.length ? (
          entries.map((entry) => <CareTimelineItem key={entry.id} entry={entry} />)
        ) : (
          <EmptyState
            icon="time-outline"
            title="Chưa có hoạt động"
            body="Những lần cho ăn, ngủ, thay bỉm và sức khỏe sẽ hiển thị tại đây."
          />
        )}
      </Card>
    </Screen>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.summary, { backgroundColor: color }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summary: { flex: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  summaryLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  kindLabel: { color: colors.ink, fontWeight: '700', fontSize: 13 },
});

