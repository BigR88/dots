import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { NEXT_7_DAYS, type TimeValue } from '@dots/shared';
import { dayOptionFromIso, dayOptions, isIsoDay, shortDayLabel } from '@/lib/time';
import { useTheme } from '@/theme/theme';

// Sichtbare Tages-Pills in der Leiste (nur Heute & Morgen). Bewusst wenige,
// damit nichts gequetscht wirkt — alle weiteren Tage laufen übers Kalender-Overlay.
const VISIBLE_DAYS = 2;

/**
 * Cleane, dynamische Datumsleiste: wenige Tages-Pills + Kalender-Button.
 * Datum = wann (getrennt von Kategorie & Beliebtheit). Aktive Auswahl = Lila.
 */
export function DateBar({
  value,
  onChange,
  onOpenCalendar,
  horizontalPadding = 14,
  variant = 'surface',
}: {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  onOpenCalendar: () => void;
  /** Seitlicher Innenabstand der Leiste. Auf der Karte 0, damit „Heute" und der
   *  Kalender direkt am Rand der Blase sitzen. */
  horizontalPadding?: number;
  /** `glass` = transparente, kompakte Pills für die schwebende Karten-Kapsel. */
  variant?: 'surface' | 'glass';
}) {
  const t = useTheme();
  const all = dayOptions();
  const visible = all.slice(0, VISIBLE_DAYS);
  const glass = variant === 'glass';

  // Ist ein Tag außerhalb der sichtbaren Pills gewählt (per Kalender)? Dann zeigt
  // der Kalender-Button diesen Tag aktiv an. „Nächste 7 Tage" ebenso. Der Kalender
  // erlaubt bis zu einem Monat im Voraus — daher das Label direkt aus dem ISO-Tag
  // ableiten (nicht nur aus den 7 Tagesoptionen).
  const isRange = value === NEXT_7_DAYS;
  const farDay = !isRange && isIsoDay(value) && !visible.some((d) => d.value === value)
    ? dayOptionFromIso(value)
    : undefined;
  const calendarActive = isRange || !!farDay;
  const calendarLabel = isRange ? '7 Tage' : farDay ? shortDayLabel(farDay) : null;

  const dark = t.scheme === 'dark';
  // Inaktive Pills: klar lesbar (Primärtext), dezente Fläche — kein „disabled"-
  // Grau. Aktiv: sattes Marken-Lila mit weichem Glow.
  const idleFill = glass
    ? dark
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(17,17,20,0.05)'
    : t.colors.surface;
  const pillStyle = (active: boolean) => [
    styles.pill,
    glass && styles.pillGlass,
    active
      ? [{ backgroundColor: t.accent, borderColor: t.accent }, activeGlow(t.accent)]
      : glass
        ? { backgroundColor: idleFill, borderColor: 'transparent' }
        : { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  ];

  return (
    <View style={[styles.row, { paddingHorizontal: horizontalPadding }]}>
      {visible.map((opt) => {
        const active = value === opt.value;
        // Glas-Variante (schmale Karten-Kapsel, links die Wortmarke): nur der
        // AKTIVE Pill trägt das Datum, inaktive nur das Wort — sonst werden
        // Labels angeschnitten (z. B. „7 Tage" am Kalender-Button).
        const compact = glass && (calendarActive || !active);
        const label = compact
          ? opt.isToday
            ? 'Heute'
            : opt.isTomorrow
              ? 'Morgen'
              : shortDayLabel(opt)
          : shortDayLabel(opt);
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={pillStyle(active)}>
            <Text
              numberOfLines={1}
              style={[styles.label, { color: active ? '#fff' : t.colors.textPrimary }]}>
              {label}
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
          color={calendarActive ? '#fff' : t.colors.textPrimary}
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

const activeGlow = (color: string): ViewStyle =>
  Platform.select({
    web: { boxShadow: `0 3px 12px ${color}59` } as unknown as ViewStyle,
    default: {
      shadowColor: color,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
  }) as ViewStyle;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    flexShrink: 1,
  },
  pillGlass: { paddingHorizontal: 11, paddingVertical: 6, minWidth: 38 },
  // Der Kalender-Pill zeigt die AKTIVE Auswahl — er gibt nie Platz ab
  // (schrumpfen dürfen nur die Tages-Pills links davon).
  calPill: { flexDirection: 'row', gap: 5, marginLeft: 'auto', flexShrink: 0 },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.2 },
});
