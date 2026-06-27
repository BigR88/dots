import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { NEXT_7_DAYS, type TimeValue } from '@dots/shared';
import {
  isIsoDay,
  isoDay,
  monthGrid,
  monthTitle,
  parseIsoDay,
  WEEKDAY_LABELS,
} from '@/lib/time';
import { useTheme } from '@/theme/theme';

/** Auswahl reicht von heute bis maximal einen Monat (30 Tage) im Voraus. */
const MAX_AHEAD_DAYS = 30;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Datums-Auswahl als eigenes Kalender-Fenster: abgedunkelter Vollbild-Hintergrund
 * mit zentrierter Karte (In-Frame-Overlay statt Modal, damit es im Geräterahmen
 * bleibt und sauber über allem liegt). Ein klassisches Monatsraster (Mo–So) mit
 * Vor-/Zurück-Navigation. Auswählbar sind nur Tage von heute bis einen Monat im
 * Voraus; ältere/spätere Tage sind ausgegraut. Lila markiert die aktive Auswahl,
 * ein Ring den heutigen Tag.
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

  // Hooks müssen vor dem frühen Return laufen.
  const today = startOfToday();
  const minIso = isoDay(today);
  const maxDate = addDays(today, MAX_AHEAD_DAYS);
  const maxIso = isoDay(maxDate);

  // Angezeigter Monat — beim Öffnen auf den gewählten (bzw. heutigen) Tag setzen.
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  useEffect(() => {
    if (!visible) return;
    const base = isIsoDay(value) ? parseIsoDay(value) : today;
    setView({ year: base.getFullYear(), month: base.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const monthIdx = (y: number, m: number) => y * 12 + m;
  const viewIdx = monthIdx(view.year, view.month);
  const canPrev = viewIdx > monthIdx(today.getFullYear(), today.getMonth());
  const canNext = viewIdx < monthIdx(maxDate.getFullYear(), maxDate.getMonth());

  const step = (dir: -1 | 1) => {
    if (dir === -1 && !canPrev) return;
    if (dir === 1 && !canNext) return;
    const next = new Date(view.year, view.month + dir, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const choose = (v: TimeValue) => {
    onSelect(v);
    onClose();
  };

  const cells = monthGrid(view.year, view.month);
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const rangeActive = value === NEXT_7_DAYS;

  return (
    <View style={styles.fill}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen">
        {/* Karte fängt Taps ab, damit sie nicht den Backdrop schließen */}
        <Pressable
          style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, cardShadow]}
          onPress={() => {}}>
          {/* Kopf: Monat + Navigation */}
          <View style={styles.head}>
            <Text style={[styles.title, { color: t.colors.textPrimary }]}>
              {monthTitle(view.year, view.month)}
            </Text>
            <View style={styles.navRow}>
              <NavButton icon="chevron-back" disabled={!canPrev} onPress={() => step(-1)} t={t} />
              <NavButton icon="chevron-forward" disabled={!canNext} onPress={() => step(1)} t={t} />
            </View>
          </View>

          {/* Wochentags-Kopfzeile */}
          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((w) => (
              <View key={w} style={styles.cell}>
                <Text style={[styles.weekday, { color: t.colors.textSecondary }]}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Tages-Raster */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((c) => {
                // Rand-Tage aus Nachbarmonaten: leere Zelle (kein Datum anzeigen).
                if (!c.inMonth) return <View key={c.iso} style={styles.cell} />;
                const selectable = c.iso >= minIso && c.iso <= maxIso;
                const isSelected = value === c.iso;
                const isToday = c.iso === minIso;
                return (
                  <View key={c.iso} style={styles.cell}>
                    <Pressable
                      disabled={!selectable}
                      onPress={() => choose(c.iso)}
                      style={({ pressed }) => [
                        styles.day,
                        isSelected && { backgroundColor: t.accent },
                        !isSelected && isToday && { borderWidth: 1.5, borderColor: t.accent },
                        pressed && selectable && !isSelected && { backgroundColor: t.colors.border },
                      ]}>
                      <Text
                        style={[
                          styles.dayNum,
                          {
                            color: isSelected
                              ? '#fff'
                              : !selectable
                                ? t.colors.textSecondary
                                : isToday
                                  ? t.accent
                                  : t.colors.textPrimary,
                          },
                          !selectable && { opacity: 0.35 },
                        ]}>
                        {c.dayNum}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Schnellauswahl: nächste 7 Tage */}
          <Pressable
            onPress={() => choose(NEXT_7_DAYS)}
            style={({ pressed }) => [
              styles.rangeBtn,
              {
                backgroundColor: rangeActive ? t.accent : 'transparent',
                borderColor: rangeActive ? t.accent : t.colors.border,
              },
              pressed && { opacity: 0.85 },
            ]}>
            <Ionicons
              name="albums-outline"
              size={15}
              color={rangeActive ? '#fff' : t.colors.textSecondary}
            />
            <Text style={[styles.rangeLabel, { color: rangeActive ? '#fff' : t.colors.textPrimary }]}>
              Nächste 7 Tage
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </View>
  );
}

function NavButton({
  icon,
  disabled,
  onPress,
  t,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  disabled: boolean;
  onPress: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.nav,
        { backgroundColor: t.colors.background, borderColor: t.colors.border },
        disabled && { opacity: 0.35 },
        pressed && !disabled && { opacity: 0.7 },
      ]}>
      <Ionicons name={icon} size={18} color={t.colors.textPrimary} />
    </Pressable>
  );
}

const cardShadow = Platform.select({
  web: { boxShadow: '0 12px 40px rgba(17,17,20,0.28)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#111114',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, textTransform: 'capitalize' },
  navRow: { flexDirection: 'row', gap: 8 },
  nav: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  weekday: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 14.5, fontWeight: '600' },
  rangeBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rangeLabel: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
});
