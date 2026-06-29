import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NEXT_7_DAYS, type GeoPoint, type QuickFilterId, type TimeValue } from '@dots/shared';
import { DateOverlay } from '@/components/DateOverlay';
import { EventBottomSheet } from '@/components/EventBottomSheet';
import { FloatingMapActions } from '@/components/FloatingMapActions';
import { MapEmptyState } from '@/components/MapEmptyState';
import { MapFilterButton } from '@/components/MapFilterButton';
import { MapFilterDropdown } from '@/components/MapFilterDropdown';
import { MapHud } from '@/components/MapHud';
import { MapToast } from '@/components/MapToast';
import { TimeFilterChips } from '@/components/TimeFilterChips';
import { MapProvider } from '@/components/map/MapProvider';
import { listEvents, type EventQuery } from '@/data/events';
import {
  applyBaseFilters,
  filterEventsByTimeStatus,
  getActiveFilterCount,
  timeStatusCounts,
  type TimeStatusFilter,
} from '@/lib/map-filters';
import { calculateHotAreas } from '@/lib/hot-areas';
import { isoDay } from '@/lib/time';
import { groupEventsByVenue, toVenueMarkers } from '@/lib/venues';
import { useLocation } from '@/hooks/use-location';
import { useLocationEnabled } from '@/hooks/use-location-enabled';
import { useTheme } from '@/theme/theme';

type Focus = { point: GeoPoint; nonce: number; zoom?: number } | null;

// Verlaufsfarbe für die Rand-Scrims (hell bzw. dunkel passend zum Schema).
const scrim = (scheme: 'light' | 'dark', alpha: number) =>
  `rgba(${scheme === 'dark' ? '11,11,15' : '255,255,255'}, ${alpha})`;

export default function MapScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { location, status, request } = useLocation();
  const [locationEnabled, setLocationEnabled] = useLocationEnabled();

  const [time, setTime] = useState<TimeValue>(isoDay(new Date()));
  // Map-Filter (eigener State, getrennt von „Entdecken"): Kategorien mehrfach.
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [quick, setQuick] = useState<QuickFilterId[]>([]);
  const [timeStatus, setTimeStatus] = useState<TimeStatusFilter | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [topH, setTopH] = useState(0);

  // „Jetzt" für den Live-Status, im Minutentakt aktualisiert.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Bei Tageswechsel (App über Mitternacht offen) „heute" mitführen.
  const prevDayRef = useRef(isoDay(now));
  useEffect(() => {
    const today = isoDay(now);
    if (today !== prevDayRef.current) {
      setTime((cur) => (cur === prevDayRef.current ? today : cur));
      prevDayRef.current = today;
    }
  }, [now]);

  // Dezenter, selbst-ausblendender Hinweis (z. B. Standort-Fehler).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(() => () => void (toastTimer.current && clearTimeout(toastTimer.current)), []);

  // Live-Status der Marker/Sheets: heute ODER Wochenansicht (per-Event korrekt).
  const liveContext = time === isoDay(now) || time === NEXT_7_DAYS;
  // Zeit-CHIPS & Zeitstatus-FILTER nur im echten Heute-Kontext — sonst würde der
  // Filter die 7-Tage-Ansicht still auf heute kollabieren (künftige Events haben
  // keinen Live-Status).
  const todayContext = time === isoDay(now);

  // Zeit-Filter verwerfen, sobald wir „heute" verlassen (kein Phantom-Filter).
  useEffect(() => {
    if (!todayContext && timeStatus !== null) setTimeStatus(null);
  }, [todayContext, timeStatus]);

  // Query holt NUR Datum + Suche; Kategorie/Schnellfilter/Zeit/Nähe laufen
  // zentral client-seitig (lib/map-filters) → keine doppelte Filterlogik.
  const query: EventQuery = {
    time,
    categorySlug: null,
    quickFilters: [],
    sort: 'date',
    origin: location,
    search: deferredSearch,
  };
  const { data } = useQuery({
    queryKey: ['events', query],
    queryFn: () => listEvents(query),
  });
  const events = useMemo(() => data ?? [], [data]);

  // Basis (ohne Zeitstatus) für die Zeit-Chip-Counts; dann finaler Zeitfilter.
  const baseEvents = useMemo(
    () => applyBaseFilters(events, { categorySlugs, quick, timeStatus: null }, { now, liveContext, origin: location }),
    [events, categorySlugs, quick, location, now, liveContext],
  );
  // Zeit-Filter nur in „heute" wirksam; sonst null (kein Kollaps der 7-Tage-Ansicht).
  const effectiveTimeStatus = todayContext ? timeStatus : null;
  const counts = useMemo(() => timeStatusCounts(baseEvents, now, todayContext), [baseEvents, now, todayContext]);
  const filteredEvents = useMemo(
    () => filterEventsByTimeStatus(baseEvents, effectiveTimeStatus, now, todayContext),
    [baseEvents, effectiveTimeStatus, now, todayContext],
  );

  const groups = useMemo(() => groupEventsByVenue(filteredEvents), [filteredEvents]);
  const markers = useMemo(() => toVenueMarkers(groups, { now, liveContext }), [groups, now, liveContext]);
  const hotAreas = useMemo(() => calculateHotAreas(filteredEvents), [filteredEvents]);
  const selectedGroup = useMemo(() => groups.find((g) => g.key === selectedKey) ?? null, [groups, selectedKey]);

  const activeFilterCount = getActiveFilterCount({ categorySlugs, quick }, !!location);
  const anyFilter = activeFilterCount > 0 || effectiveTimeStatus != null || deferredSearch.length > 0;

  // Auswahl verwerfen, wenn die gewählte Gruppe aus dem Ergebnis fällt.
  useEffect(() => {
    if (selectedKey && !groups.some((g) => g.key === selectedKey)) setSelectedKey(null);
  }, [groups, selectedKey]);

  // Beim Verlassen des Karten-Tabs offene Overlays schließen.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedKey(null);
        setFilterOpen(false);
      };
    }, []),
  );

  const toggleCategory = (slug: string) =>
    setCategorySlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));

  const locate = async () => {
    const point = (await request()) ?? location;
    if (point) {
      if (!locationEnabled) setLocationEnabled(true);
      setFocus((f) => ({ point, nonce: (f?.nonce ?? 0) + 1, zoom: 15 }));
    } else {
      // „Nähe" kann ohne Standort nicht filtern → wieder abwählen, damit Badge
      // und Filter konsistent bleiben.
      setQuick((cur) => cur.filter((q) => q !== 'near_me'));
      showToast('Standort nicht verfügbar — bitte in den Geräte-Einstellungen erlauben.');
    }
  };

  // Standort-Funktion in den Einstellungen aktiv → Standort holen.
  useEffect(() => {
    if (locationEnabled && !location && status === 'idle') void request();
  }, [locationEnabled, location, status, request]);

  const shownLocation = location;

  const toggleQuick = (id: QuickFilterId) => {
    setQuick((cur) => (cur.includes(id) ? cur.filter((q) => q !== id) : [...cur, id]));
    // „Nähe" braucht einen Standort → bei Aktivierung Opt-in anstoßen.
    if (id === 'near_me' && !quick.includes('near_me') && !location) void locate();
  };

  const resetFilters = () => {
    setCategorySlugs([]);
    setQuick([]);
    setTimeStatus(null);
    setSearch('');
  };

  const openEvent = (id: string) => {
    setSelectedKey(null);
    router.push(`/event/${id}`);
  };

  const onFilterOpen = () => setFilterOpen(true);

  const sheetOpen = !!selectedGroup || filterOpen;
  const showTimeChips = todayContext && !sheetOpen;

  const emptyMessage =
    filteredEvents.length > 0
      ? null
      : effectiveTimeStatus === 'live'
        ? 'Gerade läuft hier nichts.'
        : effectiveTimeStatus === 'soon'
          ? 'Nichts, das bald startet.'
          : effectiveTimeStatus === 'later'
            ? 'Keine späteren Events heute.'
            : quick.includes('near_me') && location
              ? 'Keine Events in deiner Nähe.'
              : anyFilter
                ? 'Keine Events für diesen Filter.'
                : 'Keine Events an diesem Tag.';

  return (
    // Hintergrund = Map-Farbe (#0b1622) statt heller Theme-Farbe: Falls die
    // Leaflet-Karte (z. B. beim Start) kurz nicht bis zur unteren Kante reicht,
    // blendet die Lücke in die Karte ein – nie ein weißer Streifen.
    <View style={[styles.root, { backgroundColor: t.scheme === 'dark' ? t.colors.background : '#0b1622' }]}>
      {/* Vollbild-Satellitenkarte */}
      <View style={StyleSheet.absoluteFill}>
        <MapProvider
          markers={markers}
          hotAreas={hotAreas}
          userLocation={shownLocation}
          selectedKey={selectedKey}
          onSelectMarker={setSelectedKey}
          focus={focus}
        />
      </View>

      {/* Weiche Verläufe oben/unten */}
      <LinearGradient
        pointerEvents="none"
        colors={[scrim(t.scheme, 0.7), scrim(t.scheme, 0)]}
        style={[styles.topScrim, { height: insets.top + 170 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[scrim(t.scheme, 0), scrim(t.scheme, 0.55)]}
        style={[styles.bottomScrim, { height: insets.bottom + 140 }]}
      />

      {/* Empty State — freundlich, mittig auf der Karte; nicht über offenen Sheets */}
      {emptyMessage && !sheetOpen && (
        <MapEmptyState message={emptyMessage} onReset={anyFilter ? resetFilters : undefined} />
      )}

      {/* Schwebende Top-Steuerung („Glass HUD"): schlanke Glas-Kapsel + EIN Filter-Orb */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + 6 }]}
        onLayout={(e) => setTopH(e.nativeEvent.layout.height)}
        pointerEvents="box-none">
        <View style={styles.hudRow}>
          <MapHud time={time} onChangeTime={setTime} onOpenCalendar={() => setCalendarOpen(true)} />
          <MapFilterButton active={anyFilter} count={activeFilterCount} onPress={onFilterOpen} />
        </View>

        {/* Zeit-Chips: nur „Heute", ausgeblendet wenn ein Sheet offen ist */}
        {showTimeChips && (
          <View style={styles.timeRow}>
            <TimeFilterChips value={timeStatus} counts={counts} onChange={setTimeStatus} />
          </View>
        )}
      </View>

      {/* Dezenter Hinweis unter der Datumsleiste (über allen Sheets) */}
      <MapToast message={toast} top={insets.top + 168} />

      {/* „In meiner Nähe" — verstecken, wenn ein Sheet offen ist */}
      {!sheetOpen && <FloatingMapActions located={!!location} onLocate={locate} bottom={insets.bottom + 92} />}

      {/* Auswahl → Event-Bottom-Sheet */}
      {selectedGroup && (
        <EventBottomSheet
          key={selectedGroup.key}
          group={selectedGroup}
          userLocation={shownLocation}
          now={now}
          liveContext={liveContext}
          onOpenEvent={openEvent}
          onClose={() => setSelectedKey(null)}
        />
      )}

      {/* Vereinheitlichtes Filter-Panel — EIN Einstieg, wie im Dashboard
          (Suche + Kategorie + Schnellfilter), klappt unter der HUD-Kapsel auf */}
      {filterOpen && (
        <MapFilterDropdown
          top={topH + 4}
          search={search}
          onSearch={setSearch}
          categorySlugs={categorySlugs}
          onToggleCategory={toggleCategory}
          quick={quick}
          onToggleQuick={toggleQuick}
          activeCount={activeFilterCount}
          onReset={resetFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {/* Kalender-Overlay */}
      <DateOverlay visible={calendarOpen} value={time} onSelect={setTime} onClose={() => setCalendarOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 20,
  },
  hudRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeRow: { paddingLeft: 2 },
});
