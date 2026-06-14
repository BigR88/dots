import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  title: string;
  subtitle?: string;
  /** Kleine Statuszeile (z. B. Demo-Hinweis) — bewusst unaufdringlich. */
  note?: string;
}

/** Einheitlicher, ruhiger Screen-Kopf: Titel + Brand-Dot, dezente Unterzeile. */
export function ScreenHeader({ title, subtitle, note }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: t.colors.textPrimary }]}>
        {title}
        <Text style={{ color: t.accent }}>.</Text>
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: t.colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {note ? <Text style={[styles.note, { color: t.colors.textMuted }]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 3 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 13.5 },
  note: { fontSize: 11, marginTop: 1 },
});
