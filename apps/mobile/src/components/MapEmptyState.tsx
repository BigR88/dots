import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

/**
 * Kleiner, freundlicher Hinweis, wenn ein Filter keine Events liefert — schwebt
 * mittig über der Karte, blockiert sie aber nicht (nur die Card ist tippbar).
 */
export function MapEmptyState({ message, onReset }: { message: string; onReset?: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.card, floatShadow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
        <Ionicons name="search-outline" size={20} color={t.colors.textMuted} />
        <Text style={[styles.text, { color: t.colors.textPrimary }]}>{message}</Text>
        {onReset && (
          <Pressable onPress={onReset} style={({ pressed }) => [styles.btn, { backgroundColor: t.accent }, pressed && { opacity: 0.9 }]}>
            <Text style={styles.btnText}>Filter löschen</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const floatShadow = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(17,17,20,0.16)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#111114',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 12 },
  card: {
    alignItems: 'center',
    gap: 10,
    maxWidth: 280,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 14.5, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  btnText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
