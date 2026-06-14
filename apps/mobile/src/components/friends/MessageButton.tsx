import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/theme';

/**
 * Dezenter, runder „Anschreiben"-Button (akzent-getönt statt voll gefüllt) —
 * klar erkennbar, aber nicht dominant.
 */
export function MessageButton({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel ?? 'Nachricht schreiben'}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: `${t.accent}16`, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.93 : 1 }] },
      ]}>
      <Ionicons name="chatbubble-ellipses" size={18} color={t.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
