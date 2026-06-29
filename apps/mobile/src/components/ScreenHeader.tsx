import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GradientText } from './GradientText';

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
      <GradientText style={styles.title}>{`${title}.`}</GradientText>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: t.colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {note ? <Text style={[styles.note, { color: t.colors.textMuted }]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 3 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 13.5 },
  note: { fontSize: 11, marginTop: 1 },
});
