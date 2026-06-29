import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GlassButton } from './GlassButton';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Der EINE Filter-Einstieg der Karte (ersetzt die getrennten Such-/Filter-
 * Buttons). Glas-Orb; füllt sich mit dem Marken-Verlauf + Glow, sobald Filter
 * aktiv sind, und pulst einmal kurz, wenn der erste Filter gesetzt wird.
 */
export function MapFilterButton({
  active,
  count,
  onPress,
}: {
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  const t = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(count);

  useEffect(() => {
    if (prev.current === 0 && count > 0) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.14, duration: 130, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.spring(scale, { toValue: 1, bounciness: 9, speed: 15, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    }
    prev.current = count;
  }, [count, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <GlassButton
        size={46}
        icon="options-outline"
        active={active}
        onPress={onPress}
        accessibilityLabel="Suchen & filtern"
      />
      {count > 0 && (
        <View
          pointerEvents="none"
          style={[styles.badge, { backgroundColor: t.accent, borderColor: t.colors.surface }]}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
