import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

/**
 * Sektions-Kopf: klarer Titel + optionaler Zähler-Chip, optional rechts eine
 * Aktion. Sentence-case (modern/social) statt schreiender Versalien.
 */
export function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: t.colors.textPrimary }]}>{title}</Text>
      {typeof count === 'number' && count > 0 && (
        <View style={[styles.chip, { backgroundColor: `${t.accent}16` }]}>
          <Text style={[styles.chipText, { color: t.accent }]}>{count}</Text>
        </View>
      )}
      <View style={styles.spacer} />
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 2 },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  chip: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12.5, fontWeight: '800' },
  spacer: { flex: 1 },
});
