import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Pill, Screen, SectionHeader } from '../../src/components/ui';
import { easyTemplates, easyTypeLabels, formatEasyTime } from '../../src/data/reference';
import { colors, radius, spacing } from '../../src/theme';

export default function EasyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = easyTemplates.find((item) => item.id === id);
  if (!template) return <Screen><Text>Không tìm thấy mẫu E.A.S.Y.</Text></Screen>;

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="time" size={28} color={colors.lavender} />
        </View>
        <Text style={styles.title}>E.A.S.Y {template.name}</Text>
        <Pill label={`Tuần ${template.fromWeek}–${template.toWeek ?? 'trở đi'}`} tone="blue" />
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>Khi nào áp dụng?</Text>
        <Text style={styles.body}>{template.conditions}</Text>
      </Card>

      <SectionHeader title="Một ngày tham khảo" />
      {template.easyTimeGroups.map((group, groupIndex) => (
        <Card key={`${template.id}-${groupIndex}`} style={styles.groupCard}>
          <Text style={styles.groupTitle}>Chu kỳ {groupIndex + 1}</Text>
          {group.easyTimes.map((slot, slotIndex) => (
            <View key={`${groupIndex}-${slotIndex}`} style={styles.slot}>
              <View style={styles.timeColumn}>
                <Text style={styles.time}>{formatEasyTime(slot.from)}</Text>
                {slot.to !== null ? <Text style={styles.timeTo}>– {formatEasyTime(slot.to)}</Text> : null}
              </View>
              <View style={styles.line} />
              <View style={styles.grow}>
                <View style={styles.types}>
                  {slot.types.map((type) => (
                    <View key={type} style={styles.typePill}>
                      <Text style={styles.typeCode}>{type}</Text>
                      <Text style={styles.typeLabel}>{easyTypeLabels[type]}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.notes}>{slot.notes}</Text>
              </View>
            </View>
          ))}
        </Card>
      ))}

      <SectionHeader title="Ghi chú từ dữ liệu gốc" />
      <Card><Text style={styles.body}>{template.notes}</Text></Card>
      <Text style={styles.disclaimer}>Đây là mẫu tham khảo để tùy chỉnh theo tín hiệu, sức khỏe và nhu cầu của bé.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  icon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontWeight: '900', fontSize: 28 },
  infoCard: { backgroundColor: colors.lavenderSoft },
  infoTitle: { color: colors.lavender, fontWeight: '900', marginBottom: spacing.sm },
  body: { color: colors.ink, lineHeight: 21, fontSize: 14 },
  groupCard: { gap: spacing.sm },
  groupTitle: { color: colors.lavender, fontWeight: '900', fontSize: 15, marginBottom: spacing.xs },
  slot: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  timeColumn: { width: 52 },
  time: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  timeTo: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  line: { width: 3, borderRadius: 2, backgroundColor: colors.lavenderSoft },
  grow: { flex: 1, gap: spacing.sm },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typePill: { flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  typeCode: { color: colors.lavender, fontWeight: '900', fontSize: 11 },
  typeLabel: { color: colors.inkMuted, fontSize: 11 },
  notes: { color: colors.ink, lineHeight: 19, fontSize: 13 },
  disclaimer: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: spacing.xl },
});

