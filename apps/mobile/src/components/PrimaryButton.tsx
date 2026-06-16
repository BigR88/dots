import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  label: string;
  onPress?: () => void;
  leftIcon?: string;
  rightIcon?: string;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Primäre Aktion im Marken-Look: solides Lila (ruhig, ohne Verlauf/Glanz).
 * Deaktiviert = neutrale Fläche.
 */
export function PrimaryButton({ label, onPress, leftIcon, rightIcon, disabled, busy, style }: Props) {
  const t = useTheme();

  const content = busy ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <>
      {leftIcon && <Ionicons name={leftIcon as never} size={19} color="#fff" />}
      <Text style={styles.label}>{label}</Text>
      {rightIcon && <Ionicons name={rightIcon as never} size={17} color="#fff" />}
    </>
  );

  if (disabled) {
    return (
      <View style={[styles.btn, { backgroundColor: t.colors.surfaceElevated }, style]}>
        <Text style={[styles.label, { color: t.colors.textMuted }]}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={busy} style={style}>
      {({ pressed }) => (
        <View style={[styles.btn, { backgroundColor: t.accent }, pressed && { opacity: 0.9 }]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  label: { color: '#fff', fontSize: 15.5, fontWeight: '800', letterSpacing: 0.2 },
});
