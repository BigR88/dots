import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  label: string;
  icon?: string;
  active?: boolean;
  /** Aktiv-Farbe (z. B. Kategorie-Farbe); Default Marken-Violett. */
  color?: string;
  onPress: () => void;
}

/**
 * Filter-/Auswahl-Pill. Aktiv: gefüllte Farbfläche mit weichem Glow + weißer
 * Schrift. Inaktiv: ruhige Glasfläche mit feiner Kante.
 */
export function FilterPill({ label, icon, active = false, color, onPress }: Props) {
  const t = useTheme();
  const fill = color ?? t.accent;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { borderRadius: t.radius.pill, transform: [{ scale: pressed ? 0.96 : 1 }] },
        active
          ? [{ backgroundColor: fill }, glow(fill)]
          : { backgroundColor: t.colors.cardGlass, borderColor: t.colors.glassBorder, borderWidth: StyleSheet.hairlineWidth },
      ]}>
      {icon && (
        <Ionicons name={icon as never} size={14} color={active ? '#fff' : fill} />
      )}
      <Text style={[styles.label, { color: active ? '#fff' : t.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const glow = (color: string): ViewStyle =>
  Platform.select({
    web: { boxShadow: `0 6px 16px ${color}59` } as unknown as ViewStyle,
    default: {
      shadowColor: color,
      shadowOpacity: 0.45,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
  }) as ViewStyle;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  label: { fontSize: 13.5, fontWeight: '700', letterSpacing: 0.1 },
});
