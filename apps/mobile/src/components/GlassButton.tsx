import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  icon?: string;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  /** Gefüllter Marken-Verlauf statt Glas (z. B. für die primäre runde Aktion). */
  active?: boolean;
  /** Solide, opake Fläche statt Milchglas — für gute Lesbarkeit über Karten/Bildern. */
  solid?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Runder „Liquid Glass"-Icon-Button (Header, Hero, Action-Bar). Ohne onPress
 * dient er als reine Glas-Schale (z. B. um ein Favoriten-Icon). `active`
 * füllt ihn mit dem Marken-Verlauf inkl. weichem Glow.
 */
export function GlassButton({
  icon,
  onPress,
  size = 44,
  iconSize,
  active = false,
  solid = false,
  accessibilityLabel,
  style,
  children,
}: PropsWithChildren<Props>) {
  const t = useTheme();
  const dark = t.scheme === 'dark';
  const r = size / 2;
  const is = iconSize ?? Math.round(size * 0.44);

  const inner = children ?? (icon ? <Ionicons name={icon as never} size={is} color={active ? '#fff' : t.colors.textPrimary} /> : null);

  const body = active ? (
    <LinearGradient
      colors={t.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.circle, { width: size, height: size, borderRadius: r }]}>
      {inner}
    </LinearGradient>
  ) : solid ? (
    <View
      style={[
        styles.circle,
        styles.glass,
        { width: size, height: size, borderRadius: r, backgroundColor: t.colors.surface, borderColor: t.colors.border },
      ]}>
      {inner}
    </View>
  ) : (
    <BlurView
      intensity={36}
      tint={dark ? 'dark' : 'light'}
      style={[
        styles.circle,
        styles.glass,
        { width: size, height: size, borderRadius: r, backgroundColor: t.colors.cardGlass, borderColor: t.colors.glassBorder },
      ]}>
      <View pointerEvents="none" style={[styles.highlight, { backgroundColor: t.colors.glassHighlight }]} />
      {inner}
    </BlurView>
  );

  const shell = (
    <View style={[active ? glow(t.accent) : softShadow, { borderRadius: r }, style]}>{body}</View>
  );

  if (!onPress) return shell;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      {shell}
    </Pressable>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: '0 8px 20px rgba(17,24,39,0.10)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#1F2A44',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
}) as ViewStyle;

const glow = (color: string): ViewStyle =>
  Platform.select({
    web: { boxShadow: `0 10px 24px ${color}66` } as unknown as ViewStyle,
    default: {
      shadowColor: color,
      shadowOpacity: 0.5,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  }) as ViewStyle;

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glass: { borderWidth: StyleSheet.hairlineWidth },
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
});
