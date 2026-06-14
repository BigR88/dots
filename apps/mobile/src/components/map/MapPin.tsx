import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import type { MapCluster } from './clustering';

const PIN_SIZE = 40;

export function MapPin({
  cluster,
  selected,
  onPress,
}: {
  cluster: MapCluster;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const count = cluster.events.length;
  const isCluster = count > 1;
  const lead = cluster.events[0];
  const color = lead.category?.color ?? t.accent;

  // Cluster-Bubble — Größe wächst leicht mit Anzahl.
  if (isCluster) {
    const size = Math.min(64, 40 + count * 3);
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.cluster,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: t.accent,
            borderColor: t.colors.background,
          },
        ]}>
        <Text style={styles.clusterText}>{count}</Text>
      </Pressable>
    );
  }

  // Einzel-Pin — Kategorie-Farbe + Icon (Tropfenform).
  return (
    <Pressable onPress={onPress} style={styles.pinWrap} hitSlop={8}>
      <View
        style={[
          styles.pin,
          {
            backgroundColor: color,
            borderColor: t.colors.background,
            transform: [{ scale: selected ? 1.25 : 1 }],
          },
        ]}>
        <Ionicons
          name={(lead.category?.icon ?? 'sparkles') as never}
          size={18}
          color="#FFFFFF"
        />
      </View>
      <View style={[styles.tip, { borderTopColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  pin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  clusterText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
