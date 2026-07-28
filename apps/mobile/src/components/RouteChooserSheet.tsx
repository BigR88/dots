import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapsProvider } from '@/lib/maps-link';
import { useTheme } from '@/theme/theme';
import { GlassView } from './GlassView';

interface Props {
  visible: boolean;
  onSelect: (provider: MapsProvider) => void;
  onClose: () => void;
}

const OPTIONS: { provider: MapsProvider; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { provider: 'apple', label: 'Apple Karten', icon: 'logo-apple' },
  { provider: 'google', label: 'Google Maps', icon: 'logo-google' },
];

/**
 * Auswahl des Karten-Anbieters vor dem Öffnen einer Route (Apple Karten oder
 * Google Maps). Bewusst kein RN-<Modal>/Alert (funktioniert im Web nicht bzw.
 * bricht aus dem Vorschau-Rahmen) — Inline-Overlay wie ConfirmSheet, damit es
 * auf allen Plattformen identisch läuft.
 */
export function RouteChooserSheet({ visible, onSelect, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>Route öffnen mit</Text>

        {OPTIONS.map(({ provider, label, icon }) => (
          <Pressable
            key={provider}
            onPress={() => onSelect(provider)}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: t.colors.surfaceElevated, borderColor: t.colors.border },
              pressed && { opacity: 0.7 },
            ]}>
            <Ionicons name={icon} size={20} color={t.colors.textPrimary} />
            <Text style={[styles.optionText, { color: t.colors.textPrimary }]}>{label}</Text>
            <Ionicons name="open-outline" size={16} color={t.colors.textSecondary} />
          </Pressable>
        ))}

        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: t.colors.textSecondary }]}>Abbrechen</Text>
        </Pressable>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 200 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionText: { flex: 1, fontSize: 15.5, fontWeight: '700' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
