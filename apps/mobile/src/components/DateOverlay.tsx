import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { NEXT_7_DAYS, type TimeValue } from '@dots/shared';
import { dayOptions, longDayLabel } from '@/lib/time';
import { useTheme } from '@/theme/theme';

/**
 * Datums-Auswahl als In-Frame-Overlay (KEIN Modal): einzelne, frei schwebende
 * Buttons untereinander, mittig über der abgedunkelt sichtbaren Karte/Liste —
 * ohne umschließende Box. „Alle 7 Tage" steht unten. Tippen führt direkt aus und
 * schließt das Overlay. Lila nur für die aktive Auswahl.
 */
export function DateOverlay({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: TimeValue;
  onSelect: (value: TimeValue) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  if (!visible) return null;
  const days = dayOptions();

  const choose = (v: TimeValue) => {
    onSelect(v);
    onClose();
  };

  const Pill = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        floatShadow,
        { backgroundColor: active ? t.accent : t.colors.surface },
        pressed && { opacity: 0.85 },
      ]}>
      <Text style={[styles.label, { color: active ? '#fff' : t.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.fill}>
      {/* Abgedunkelter, durchscheinender Hintergrund — Karte bleibt sichtbar */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />

      {/* Einzelne, frei schwebende Buttons untereinander (keine Box) */}
      <View style={styles.center} pointerEvents="box-none">
        {days.map((opt) => (
          <Pill
            key={opt.value}
            active={value === opt.value}
            label={longDayLabel(opt)}
            onPress={() => choose(opt.value)}
          />
        ))}
        <Pill
          active={value === NEXT_7_DAYS}
          label="Alle 7 Tage"
          onPress={() => choose(NEXT_7_DAYS)}
        />
      </View>
    </View>
  );
}

const floatShadow = Platform.select({
  web: { boxShadow: '0 4px 14px rgba(17,17,20,0.18)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#111114',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,17,20,0.42)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  pill: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
});
