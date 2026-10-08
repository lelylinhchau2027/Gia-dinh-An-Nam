import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { careMeta } from '../data/care';
import { colors, radius, spacing } from '../theme';
import type { CareEntry } from '../types';
import { formatClock } from './ui';

export function CareTimelineItem({ entry }: { entry: CareEntry }) {
  const meta = careMeta[entry.kind];
  const value = entry.amount !== null
    ? `${entry.amount}${entry.unit ? ` ${entry.unit}` : ''}`
    : entry.note || 'Đã ghi nhận';
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: meta.soft }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.line}>
          <Text style={styles.title}>{meta.label}</Text>
          <Text style={styles.time}>{formatClock(entry.occurred_at)}</Text>
        </View>
        <Text numberOfLines={2} style={styles.value}>{value}</Text>
        <Text style={styles.author}>{entry.created_by_name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingBottom: spacing.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  time: { color: colors.inkMuted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 14 },
  author: { color: colors.inkMuted, fontSize: 12 },
});

