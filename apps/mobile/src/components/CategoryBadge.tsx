import { StyleSheet, Text, View } from 'react-native';
import type { Category } from '@dots/shared';
import { useTheme } from '@/theme/theme';

/** #RRGGBB + Alpha → rgba()-String (für dezente Farbflächen). */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Kategorie-Pille: getönte Fläche in der Kategorie-Farbe + farbiger Punkt + Name.
 * Klein, kräftig, gut lesbar — die schnelle „Was ist das?"-Antwort.
 */
export function CategoryBadge({ category, size = 'md' }: { category: Category | null; size?: 'sm' | 'md' }) {
  const t = useTheme();
  const color = category?.color ?? t.accent;
  const name = category?.name ?? 'Event';
  const sm = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        sm && styles.badgeSm,
        { backgroundColor: withAlpha(color, t.scheme === 'dark' ? 0.24 : 0.14) },
      ]}>
      <View style={[styles.dot, sm && styles.dotSm, { backgroundColor: color }]} />
      <Text style={[styles.text, sm && styles.textSm, { color }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 3, gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotSm: { width: 6, height: 6 },
  text: { fontSize: 12.5, fontWeight: '800', letterSpacing: -0.1 },
  textSm: { fontSize: 11 },
});
