import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { GeoPoint } from '@dots/shared';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { useTheme } from '@/theme/theme';

// Zeigt die Luftlinie zwischen Nutzerstandort und Event (nur wenn Standort opt-in).
export function DistanceLabel({
  from,
  to,
  size = 14,
}: {
  from: GeoPoint | null;
  to: GeoPoint | null;
  size?: number;
}) {
  const t = useTheme();
  if (!from || !to) return null;
  const meters = distanceMeters(from, to);
  return (
    <View style={styles.row}>
      <Ionicons name="navigate-outline" size={size} color={t.colors.textSecondary} />
      <Text style={[styles.text, { color: t.colors.textSecondary, fontSize: size }]}>
        {formatDistance(meters)} entfernt
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontWeight: '500' },
});
