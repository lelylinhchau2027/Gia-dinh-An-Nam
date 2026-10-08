import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTitle } from '../../src/components/AppTitle';
import { Card, EmptyState, LinkButton, PrimaryButton, Screen, SectionHeader, formatDateTime } from '../../src/components/ui';
import { useApp } from '../../src/providers/AppProvider';
import { colors, radius, spacing } from '../../src/theme';

export default function FamilyScreen() {
  const { family, messages, reminders, completeReminder } = useApp();
  return (
    <Screen>
      <AppTitle
        eyebrow="Không gian của hai người"
        title="Cùng chăm con"
        subtitle="Nhắn nhanh, phân công và nhắc nhau ngay trong một nơi."
      />

      <Card style={styles.familyCard}>
        <View style={styles.familyIcon}>
          <Ionicons name="people" size={28} color={colors.sage} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.familyName}>{family?.name}</Text>
          <Text style={styles.codeLabel}>Mã ghép đôi</Text>
          <Text selectable style={styles.code}>{family?.pairing_code}</Text>
        </View>
        <View style={styles.memberStack}>
          <View style={[styles.member, { backgroundColor: colors.primarySoft }]}><Text>Ba</Text></View>
          <View style={[styles.member, styles.memberSecond, { backgroundColor: colors.sageSoft }]}><Text>Mẹ</Text></View>
        </View>
      </Card>
      <PrimaryButton
        title="Tạo hoặc nhập mã ghép đôi"
        icon="link-outline"
        onPress={() => router.push('/family/connect')}
      />

      <SectionHeader
        title="Việc chung"
        action={<LinkButton title="Tạo việc" onPress={() => router.push('/reminder/new')} />}
      />
      <Card>
        {reminders.length ? reminders.slice(0, 8).map((item) => (
          <Pressable
            key={item.id}
            disabled={Boolean(item.completed_at)}
            onPress={() => completeReminder(item)}
            style={styles.taskRow}
          >
            <Ionicons
              name={item.completed_at ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={item.completed_at ? colors.sage : colors.amber}
            />
            <View style={styles.grow}>
              <Text style={[styles.taskTitle, item.completed_at && styles.done]}>{item.title}</Text>
              <Text style={styles.taskMeta}>{formatDateTime(item.due_at)} · {item.created_by_name}</Text>
            </View>
          </Pressable>
        )) : (
          <EmptyState icon="checkbox-outline" title="Chưa có việc chung" body="Tạo lịch tiêm, mua đồ hoặc việc cần người còn lại thực hiện." />
        )}
      </Card>

      <SectionHeader
        title="Lời nhắn"
        action={<LinkButton title="Viết lời nhắn" onPress={() => router.push('/family/message')} />}
      />
      <View style={styles.messages}>
        {messages.map((message) => (
          <View key={message.id} style={styles.messageBubble}>
            <Text style={styles.messageBody}>{message.body}</Text>
            <Text style={styles.messageMeta}>{message.created_by_name} · {formatDateTime(message.created_at)}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  familyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  familyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  familyName: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  codeLabel: { color: colors.inkMuted, fontSize: 11, marginTop: 4 },
  code: { color: colors.primary, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  memberStack: { flexDirection: 'row', width: 66 },
  member: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  memberSecond: { marginLeft: -10, borderWidth: 2, borderColor: colors.surface },
  taskRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  taskTitle: { color: colors.ink, fontWeight: '800' },
  taskMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 },
  done: { textDecorationLine: 'line-through', color: colors.inkMuted },
  messages: { gap: spacing.md },
  messageBubble: { alignSelf: 'stretch', padding: spacing.lg, backgroundColor: colors.sageSoft, borderRadius: radius.lg, borderBottomLeftRadius: radius.sm },
  messageBody: { color: colors.ink, lineHeight: 21, fontSize: 15 },
  messageMeta: { color: colors.inkMuted, fontSize: 11, marginTop: spacing.sm },
});
