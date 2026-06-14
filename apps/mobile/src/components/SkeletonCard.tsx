import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';

/** Lade-Platzhalter im Listen-Zeilen-Layout der EventCard. */
export function SkeletonCard() {
  const t = useTheme();
  const block = (style: object) => (
    <View style={[{ backgroundColor: t.colors.surfaceElevated, borderRadius: 6 }, style]} />
  );
  return (
    <View style={[styles.row, { borderBottomColor: t.colors.border }]}>
      {block({ width: 54, height: 54, borderRadius: 16 })}
      <View style={styles.content}>
        {block({ height: 10, width: '35%' })}
        {block({ height: 16, width: '85%' })}
        {block({ height: 12, width: '50%' })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { flex: 1, gap: 8, paddingTop: 2 },
});
