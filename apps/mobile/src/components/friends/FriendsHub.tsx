import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenGradient } from '@/components/ScreenGradient';
import { palette, useTheme } from '@/theme/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const CIRCLE = 184;

/**
 * Landing der „Freunde"-Tab: zwei große, langsam pulsierende Lila-Kreise.
 * „Freunde" öffnet die bestehende Freundesliste, „Gruppen" das (später
 * folgende) Gruppen-Menü. Der Puls läuft leicht versetzt, damit die Kreise
 * nicht synchron atmen.
 */
export function FriendsHub({ onFriends, onGroups }: { onFriends: () => void; onGroups: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, paddingTop: insets.top }]}>
      <ScreenGradient />
      <View style={[styles.center, { paddingBottom: insets.bottom + 90 }]}>
        <PulseCircle icon="people" label="Freunde" onPress={onFriends} delay={0} />
        <PulseCircle icon="albums" label="Gruppen" onPress={onGroups} delay={900} />
      </View>
    </View>
  );
}

function PulseCircle({
  icon,
  label,
  onPress,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  delay: number;
}) {
  // 0 → 1 → 0, endlos. Steuert sowohl das Atmen des Kreises als auch den Halo.
  const pulse = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [pulse, delay]);

  const breathe = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.32] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  const setPressed = (v: number) =>
    Animated.timing(press, { toValue: v, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(1)}
      onPressOut={() => setPressed(0)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.slot}>
      {/* Weicher, pulsierender Lila-Halo hinter dem Kreis */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { backgroundColor: palette.accent, opacity: haloOpacity, transform: [{ scale: haloScale }] },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: breathe }, { scale: pressScale }] }}>
        <LinearGradient
          colors={[palette.accent, palette.accentMuted]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.circle, glow]}>
          <Ionicons name={icon} size={40} color="#fff" />
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const glow = Platform.select({
  web: { boxShadow: '0 18px 44px rgba(108,92,255,0.45)' } as unknown as ViewStyle,
  default: {
    shadowColor: palette.accent,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 44 },
  slot: { width: CIRCLE, height: CIRCLE, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
});
