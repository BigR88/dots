import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type DimensionValue } from 'react-native';
import { palette } from '@/theme/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Markenzeichen-Hintergrund: sanft pulsierende Lila-Punkte, über den ganzen
 * Screen verteilt. Rein dekorativ (pointerEvents="none"), liegt hinter dem
 * Inhalt. Feste Streuung + versetzte Delays, damit es ruhig „atmet".
 */
const DOTS: { top: DimensionValue; left: DimensionValue; size: number; delay: number; opacity: number }[] = [
  { top: '5%', left: '10%', size: 72, delay: 0, opacity: 0.2 },
  { top: '12%', left: '74%', size: 116, delay: 700, opacity: 0.14 },
  { top: '28%', left: '38%', size: 150, delay: 1300, opacity: 0.1 },
  { top: '24%', left: '6%', size: 52, delay: 300, opacity: 0.22 },
  { top: '42%', left: '84%', size: 66, delay: 1000, opacity: 0.18 },
  { top: '54%', left: '16%', size: 128, delay: 450, opacity: 0.12 },
  { top: '60%', left: '66%', size: 92, delay: 1600, opacity: 0.16 },
  { top: '73%', left: '42%', size: 60, delay: 850, opacity: 0.2 },
  { top: '83%', left: '10%', size: 104, delay: 200, opacity: 0.12 },
  { top: '88%', left: '78%', size: 74, delay: 1150, opacity: 0.18 },
];

function Dot({
  top,
  left,
  size,
  delay,
  opacity,
}: {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  delay: number;
  opacity: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
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

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.24] });
  const op = pulse.interpolate({ inputRange: [0, 1], outputRange: [opacity * 0.45, opacity] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.accent,
        opacity: op,
        transform: [{ scale }],
      }}
    />
  );
}

export function PulsingDotsBackground() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      {DOTS.map((d, i) => (
        <Dot key={i} {...d} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
