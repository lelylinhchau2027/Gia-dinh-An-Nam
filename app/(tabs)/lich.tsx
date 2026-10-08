import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTitle } from '../../src/components/AppTitle';
import { Card, Pill, Screen } from '../../src/components/ui';
import {
  easyTemplates,
  formatLegacyRange,
  legacyPregnancyExaminations,
  referenceRelease,
  vaccineGroups,
} from '../../src/data/reference';
import { colors, radius, spacing } from '../../src/theme';

type Section = 'vaccines' | 'easy' | 'pregnancy';

export default function ReferenceScreen() {
  const [section, setSection] = useState<Section>('vaccines');
  return (
    <Screen>
      <AppTitle
        eyebrow="Dữ liệu tham chiếu"
        title="Lịch & cột mốc"
        subtitle="Đọc dễ hơn JSON, có nguồn và phiên bản để cập nhật an toàn."
      />

      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.amber} />
        <View style={styles.grow}>
          <Text style={styles.noticeTitle}>{referenceRelease.label}</Text>
          <Text style={styles.noticeBody}>{referenceRelease.warning}</Text>
        </View>
      </View>

      <View style={styles.segment}>
        <Segment label="Tiêm phòng" active={section === 'vaccines'} onPress={() => setSection('vaccines')} />
        <Segment label="E.A.S.Y" active={section === 'easy'} onPress={() => setSection('easy')} />
        <Segment label="Khám thai" active={section === 'pregnancy'} onPress={() => setSection('pregnancy')} />
      </View>

      {section === 'vaccines'
        ? vaccineGroups.map((group) => (
            <Pressable
              key={group.name}
              onPress={() => router.push(`/vaccine/${group.milestones[0]?.id}`)}
            >
              <Card style={styles.listCard}>
                <View style={styles.listIcon}>
                  <Ionicons name="medical-outline" size={23} color={colors.primary} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.listTitle}>{group.name}</Text>
                  <Text style={styles.listMeta}>
                    {group.milestones.length} mốc · {formatLegacyRange(group.milestones[0]!)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
              </Card>
            </Pressable>
          ))
        : null}

      {section === 'easy'
        ? easyTemplates.map((template) => (
            <Pressable key={template.id} onPress={() => router.push(`/easy/${template.id}`)}>
              <Card style={styles.listCard}>
                <View style={[styles.listIcon, { backgroundColor: colors.lavenderSoft }]}>
                  <Ionicons name="time-outline" size={23} color={colors.lavender} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.listTitle}>E.A.S.Y {template.name}</Text>
                  <Text style={styles.listMeta}>
                    Tuần {template.fromWeek}–{template.toWeek ?? 'trở đi'} ·{' '}
                    {template.easyTimeGroups.reduce((count, group) => count + group.easyTimes.length, 0)} khung
                  </Text>
                </View>
                <Pill label="Mẫu gốc" tone="blue" />
              </Card>
            </Pressable>
          ))
        : null}

      {section === 'pregnancy'
        ? legacyPregnancyExaminations.map((item) => (
            <Card key={item.id} style={styles.listCard}>
              <View style={[styles.listIcon, { backgroundColor: colors.sageSoft }]}>
                <Ionicons name="heart-outline" size={23} color={colors.sage} />
              </View>
              <View style={styles.grow}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listMeta}>{formatLegacyRange(item)}</Text>
                {item.description ? (
                  <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
                ) : null}
              </View>
            </Card>
          ))
        : null}
    </Screen>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.amberSoft, borderRadius: radius.md,
  },
  noticeTitle: { color: colors.ink, fontWeight: '900', marginBottom: 3 },
  noticeBody: { color: colors.inkMuted, fontSize: 13, lineHeight: 18 },
  grow: { flex: 1 },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, padding: 4, borderRadius: radius.md },
  segmentButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: colors.primary, fontWeight: '900' },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  listIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  listTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  listMeta: { color: colors.inkMuted, fontSize: 13, marginTop: 3 },
  description: { color: colors.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 6 },
});

