import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTitle } from '../../src/components/AppTitle';
import { CareTimelineItem } from '../../src/components/CareTimelineItem';
import { Card, EmptyState, LinkButton, Pill, Screen, SectionHeader } from '../../src/components/ui';
import { careMeta, quickCareKinds } from '../../src/data/care';
import { useApp } from '../../src/providers/AppProvider';
import { colors, radius, spacing } from '../../src/theme';
import type { CareKind } from '../../src/types';

export default function HomeScreen() {
  const { child, entries, reminders, pendingSyncCount } = useApp();
  const today = new Date().toDateString();
  const todayEntries = entries.filter(
    (entry) => new Date(entry.occurred_at).toDateString() === today,
  );
  const dueReminders = reminders.filter((item) => !item.completed_at).slice(0, 2);

  const openCare = (kind: CareKind) =>
    router.push({ pathname: '/record/new', params: { kind } });

  return (
    <Screen>
      <AppTitle
        eyebrow="Gia Đình An Nam"
        title={`Chào buổi ${new Date().getHours() < 12 ? 'sáng' : 'tối'} 🌿`}
        subtitle="Hai người, một nhịp chăm con."
      />

      <Card style={styles.childCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{child?.nickname?.slice(0, 1) || 'A'}</Text>
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child?.nickname || child?.name || 'Bé yêu'}</Text>
          <Text style={styles.childMeta}>{todayEntries.length} hoạt động hôm nay</Text>
        </View>
        <Pill
          label={pendingSyncCount ? `${pendingSyncCount} chờ đồng bộ` : 'Đã đồng bộ'}
          tone={pendingSyncCount ? 'amber' : 'sage'}
        />
      </Card>

      <SectionHeader title="Ghi nhanh" />
      <View style={styles.quickGrid}>
        {quickCareKinds.map((kind) => {
          const meta = careMeta[kind];
          return (
            <Pressable
              key={kind}
              onPress={() => openCare(kind)}
              style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}
            >
              <View style={[styles.quickIcon, { backgroundColor: meta.soft }]}>
                <Ionicons name={meta.icon} size={24} color={meta.color} />
              </View>
              <Text style={styles.quickLabel}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader
        title="Sắp tới"
        action={<LinkButton title="Thêm nhắc việc" onPress={() => router.push('/reminder/new')} />}
      />
      <Card>
        {dueReminders.length ? (
          dueReminders.map((item) => (
            <View style={styles.reminderRow} key={item.id}>
              <Ionicons name="notifications-outline" size={20} color={colors.amber} />
              <View style={styles.grow}>
                <Text style={styles.reminderTitle}>{item.title}</Text>
                <Text style={styles.reminderTime}>
                  {new Intl.DateTimeFormat('vi-VN', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  }).format(new Date(item.due_at))}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            icon="notifications-off-outline"
            title="Chưa có việc sắp tới"
            body="Tạo nhắc việc chung để cả hai không bỏ lỡ lịch của bé."
          />
        )}
      </Card>

      <SectionHeader
        title="Hoạt động gần đây"
        action={<LinkButton title="Xem tất cả" onPress={() => router.push('/theo-doi')} />}
      />
      <Card>
        {entries.length ? (
          entries.slice(0, 4).map((entry) => <CareTimelineItem entry={entry} key={entry.id} />)
        ) : (
          <EmptyState
            icon="leaf-outline"
            title="Bắt đầu nhật ký hôm nay"
            body="Chạm một mục ghi nhanh phía trên để thêm hoạt động đầu tiên."
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  childCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 23, fontWeight: '900' },
  childInfo: { flex: 1, gap: 3 },
  childName: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  childMeta: { color: colors.inkMuted, fontSize: 13 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickButton: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  quickIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  reminderTitle: { color: colors.ink, fontWeight: '800' },
  reminderTime: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  grow: { flex: 1 },
});

