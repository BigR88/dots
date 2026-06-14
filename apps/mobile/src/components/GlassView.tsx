import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  style?: ViewStyle | ViewStyle[];
  /** Blur-Stärke (0–100). */
  intensity?: number;
  /** Dezente Glas-Kante oben/aussen. */
  bordered?: boolean;
}

/**
 * „Liquid Glass"-Fläche: durchscheinendes Milchglas (Blur) + leichter Tint +
 * feine Lichtkante. Auf Web nutzt expo-blur `backdrop-filter`, nativ echtes
 * Blur. Inhalt liegt darüber.
 */
export function GlassView({ children, style, intensity = 40, bordered = true }: PropsWithChildren<Props>) {
  const t = useTheme();
  const dark = t.scheme === 'dark';
  return (
    <BlurView
      intensity={intensity}
      tint={dark ? 'dark' : 'light'}
      style={[
        styles.base,
        {
          backgroundColor: dark ? 'rgba(20,20,26,0.55)' : 'rgba(255,255,255,0.6)',
          borderColor: bordered ? (dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)') : 'transparent',
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}>
      {bordered && (
        <View
          pointerEvents="none"
          style={[styles.highlight, { backgroundColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)' }]}
        />
      )}
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  // feine Lichtkante am oberen Rand (Glas-Glanz)
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
});
