import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

/** Kleiner, ruhiger Sektions-Titel mit optionaler Beschreibung. */
export function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: t.colors.textPrimary }]}>{title}</Text>
      {hint ? <Text style={[styles.hint, { color: t.colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2, paddingHorizontal: 2, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  hint: { fontSize: 12.5 },
});
