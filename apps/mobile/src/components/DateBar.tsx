import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NEXT_7_DAYS, type TimeValue } from '@dots/shared';
import { dayOptions, shortDayLabel } from '@/lib/time';
import { useTheme } from '@/theme/theme';

// Sichtbare Tages-Pills in der Leiste (Heute, Morgen + 1 Folgetag). Bewusst
// wenige, damit nichts gequetscht wirkt — der Rest läuft übers Kalender-Overlay.
const VISIBLE_DAYS = 3;

/**
 * Cleane, dynamische Datumsleiste: wenige Tages-Pills + Kalender-Button.
 * Datum = wann (getrennt von Kategorie & Beliebtheit). Aktive Auswahl = Lila.
 */
export function DateBar({
  value,
  onChange,
  onOpenCalendar,
}: {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  onOpenCalendar: () => void;
}) {
  const t = useTheme();
  const all = dayOptions();
  const visible = all.slice(0, VISIBLE_DAYS);

  // Ist ein Tag außerhalb der sichtbaren Pills gewählt (per Kalender)? Dann zeigt
  // der Kalender-Button diesen Tag aktiv an. „Nächste 7 Tage" ebenso.
  const isRange = value === NEXT_7_DAYS;
  const farDay = !isRange && !visible.some((d) => d.value === value)
    ? all.find((d) => d.value === value)
    : undefined;
  const calendarActive = isRange || !!farDay;
  const calendarLabel = isRange ? '7 Tage' : farDay ? shortDayLabel(farDay) : null;

  const pillStyle = (active: boolean) => [
    styles.pill,
    active
      ? { backgroundColor: t.accent, borderColor: t.accent }
      : { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  ];

  return (
    <View style={styles.row}>
      {visible.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={pillStyle(active)}>
            <Text
              numberOfLines={1}
              style={[styles.label, { color: active ? '#fff' : t.colors.textSecondary }]}>
              {shortDayLabel(opt)}
            </Text>
          </Pressable>
        );
      })}

      {/* Kalender-/Mehr-Button am Ende der Leiste */}
      <Pressable
        onPress={onOpenCalendar}
        accessibilityLabel="Datum wählen"
        style={[...pillStyle(calendarActive), styles.calPill]}>
        <Ionicons
          name="calendar-outline"
          size={16}
          color={calendarActive ? '#fff' : t.colors.textSecondary}
        />
        {calendarLabel ? (
          <Text numberOfLines={1} style={[styles.label, { color: '#fff' }]}>
            {calendarLabel}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14 },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  calPill: { flexDirection: 'row', gap: 5, marginLeft: 'auto' },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.2 },
});
