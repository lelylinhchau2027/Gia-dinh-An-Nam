import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Pill, Screen, SectionHeader } from '../../src/components/ui';
import { activeVaccinations, formatLegacyRange, referenceRelease, verifiedVaccinationDatasets } from '../../src/data/reference';
import { colors, radius, spacing } from '../../src/theme';

export default function VaccineDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const selected = activeVaccinations.find((item) => item.id === id);
  if (!selected) {
    return <Screen><Text>Không tìm thấy dữ liệu lịch tiêm.</Text></Screen>;
  }
  const groupName = selected.shortTitle || selected.title;
  const milestones = activeVaccinations.filter(
    (item) => (item.shortTitle || item.title) === groupName,
  );
  const verifiedDataset = verifiedVaccinationDatasets.find((dataset) =>
    dataset.items.some((item) => item.id === selected.id),
  );
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="medical" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>{groupName.replace(/\n/g, ' ')}</Text>
        <View style={styles.pills}>
          <Pill label={`${milestones.length} mốc`} tone="rose" />
          <Pill label={verifiedDataset ? 'Đã kiểm chứng' : 'Dữ liệu gốc'} tone={verifiedDataset ? 'sage' : 'amber'} />
        </View>
      </View>

      <View style={styles.warning}>
        <Ionicons name="warning-outline" size={20} color={colors.amber} />
        <Text style={styles.warningText}>
          {verifiedDataset
            ? `${verifiedDataset.sourceName} · rà soát ${verifiedDataset.reviewedAt}. Lịch cá nhân vẫn cần cơ sở tiêm chủng xác nhận.`
            : referenceRelease.warning}
        </Text>
      </View>

      <SectionHeader title={verifiedDataset ? 'Lịch đang áp dụng trong app' : 'Các mốc từ dữ liệu gốc'} />
      {milestones.map((milestone, index) => {
        const dose = milestone.extraItems.find((item) => item.name === 'Đến lịch tiêm');
        return (
          <Card key={milestone.id}>
            <View style={styles.milestoneHeader}>
              <View style={styles.index}><Text style={styles.indexText}>{index + 1}</Text></View>
              <View style={styles.grow}>
                <Text style={styles.milestoneTitle}>{dose?.value || `Mốc ${index + 1}`}</Text>
                <Text style={styles.range}>{formatLegacyRange(milestone)}</Text>
              </View>
            </View>
            {milestone.description ? <Text style={styles.description}>{milestone.description}</Text> : null}
            {milestone.extraItems
              .filter((item) => item.name !== 'Đến lịch tiêm')
              .map((item) => (
                <View key={item.name} style={styles.extra}>
                  <Text style={styles.extraName}>{item.name}</Text>
                  <Text style={styles.extraValue}>{item.value}</Text>
                </View>
              ))}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  icon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  pills: { flexDirection: 'row', gap: spacing.sm },
  warning: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.amberSoft, padding: spacing.md, borderRadius: radius.md },
  warningText: { flex: 1, color: colors.inkMuted, lineHeight: 19, fontSize: 13 },
  milestoneHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  index: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  indexText: { color: colors.primary, fontWeight: '900' },
  grow: { flex: 1 },
  milestoneTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  range: { color: colors.primary, fontWeight: '700', marginTop: 3 },
  description: { color: colors.inkMuted, lineHeight: 20, marginTop: spacing.md },
  extra: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: spacing.md, marginTop: spacing.md, gap: spacing.xs },
  extraName: { color: colors.sage, fontWeight: '900', fontSize: 13 },
  extraValue: { color: colors.ink, lineHeight: 20, fontSize: 13 },
});
