import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import type { EventTimeStatus } from '@/lib/event-time';
import { timeStatusLabel } from '@/lib/event-time';
import { useTheme } from '@/theme/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Farb-Token je Status (Lila bleibt aktiven Markern/CTAs vorbehalten).
const STATUS_COLOR: Record<Exclude<EventTimeStatus, 'past'>, string> = {
  live: '#20C978', // Grün = jetzt
  soon: '#FF9500', // Amber = bald
  later: '#8A90A0', // neutral
};

/**
 * Kleine, hochwertige Status-Pill fürs Bottom-Sheet: „Läuft jetzt / Startet bald
 * / Später". `live` bekommt einen sanft pulsierenden Punkt. `past` und `null`
 * rendern nichts (dann steht die Uhrzeit im Fokus).
 */
export function EventTimeStatusBadge({
  status,
  compact,
}: {
  status: EventTimeStatus | null;
  /** Kompakte Variante für die kleinen Event-Cards bei mehreren Events. */
  compact?: boolean;
}) {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'live') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  if (!status || status === 'past') return null;

  const color = STATUS_COLOR[status];
  const dark = t.scheme === 'dark';
  const bg = color + (dark ? '26' : '1C');

  return (
    <View style={[styles.pill, compact && styles.pillCompact, { backgroundColor: bg }]}>
      {status === 'live' ? (
        <Animated.View style={[styles.dot, { backgroundColor: color, opacity: pulse }]} />
      ) : (
        <View style={[styles.dotStatic, { backgroundColor: color }]} />
      )}
      <Text style={[styles.text, compact && styles.textCompact, { color }]}>{timeStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillCompact: { paddingHorizontal: 7, paddingVertical: 2, gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotStatic: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11.5, fontWeight: '800', letterSpacing: -0.1 },
  textCompact: { fontSize: 10.5, fontWeight: '700' },
});
