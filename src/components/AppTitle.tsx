import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export function AppTitle({ eyebrow, title, subtitle }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, paddingTop: spacing.md },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontWeight: '900', fontSize: 30, letterSpacing: -0.8 },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 21 },
});

