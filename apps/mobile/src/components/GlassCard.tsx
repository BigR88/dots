import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  /** Inhalts-/Layout-Styles (Padding, flexDirection, gap, maxHeight …). Liegen
   *  auf der Glasfläche selbst, damit Kinder korrekt umbrechen. */
  style?: ViewStyle | ViewStyle[];
  /** Äußere Styles (Margin/Positionierung) für den Schatten-Wrapper. */
  outerStyle?: ViewStyle | ViewStyle[];
  /** Blur-Stärke (0–100). Dezent halten — Performance. */
  intensity?: number;
  /** Eckenradius (Default: großzügig, „Liquid Glass"). */
  radius?: number;
  /** Weicher Schlagschatten (Default an). */
  shadow?: boolean;
}

/**
 * „Liquid Glass"-Karte: durchscheinendes Milchglas (Blur) + halbtransparenter
 * Tint + feine Lichtkante oben + weicher, großer Schatten. Basis für Event-
 * Cards, Filter-Panel, Info-Karten. Inhalt liegt über dem Glas.
 */
export function GlassCard({
  children,
  style,
  outerStyle,
  intensity = 34,
  radius,
  shadow = true,
}: PropsWithChildren<Props>) {
  const t = useTheme();
  const dark = t.scheme === 'dark';
  const r = radius ?? t.radius.xl;

  return (
    <View style={[shadow && (dark ? styles.shadowDark : styles.shadow), { borderRadius: r }, outerStyle]}>
      <BlurView
        intensity={intensity}
        tint={dark ? 'dark' : 'light'}
        style={[
          styles.glass,
          {
            borderRadius: r,
            backgroundColor: t.colors.cardGlass,
            borderColor: t.colors.glassBorder,
          },
          style,
        ]}>
        <View
          pointerEvents="none"
          style={[styles.highlight, { backgroundColor: t.colors.glassHighlight }]}
        />
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  shadow: {
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(17,17,20,0.04)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#111114',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      },
    }),
  },
  shadowDark: {
    ...Platform.select({
      web: { boxShadow: '0 18px 40px rgba(0,0,0,0.45)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
        elevation: 8,
      },
    }),
  },
});
