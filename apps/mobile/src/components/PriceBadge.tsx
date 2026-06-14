import { StyleSheet, Text } from 'react-native';
import type { DotsEvent } from '@dots/shared';
import { palette } from '@dots/shared';
import { formatPrice, isFree } from '@/lib/format';
import { useTheme } from '@/theme/theme';

/** Preis als reiner Text — grün für „Free", sonst Ink. */
export function PriceBadge({ event }: { event: DotsEvent }) {
  const t = useTheme();
  const free = isFree(event);
  return (
    <Text style={[styles.text, { color: free ? palette.success : t.colors.textPrimary }]}>
      {formatPrice(event)}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 13, fontWeight: '700' },
});
