import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme/theme';

/** Kompakter „Hinzufügen"-CTA (Suchergebnis-Zeile) mit Lade-Zustand. */
export function AddButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.btn, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}>
      {busy ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="person-add" size={14} color="#fff" />
          <Text style={styles.text}>Hinzufügen</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 116,
    justifyContent: 'center',
  },
  text: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
