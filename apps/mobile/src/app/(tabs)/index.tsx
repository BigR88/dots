import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NEXT_7_DAYS, type GeoPoint, type QuickFilterId, type TimeValue } from '@dots/shared';
import { DateBar } from '@/components/DateBar';
import { DateOverlay } from '@/components/DateOverlay';
import { EventBottomSheet } from '@/components/EventBottomSheet';
import { FilterPanel } from '@/components/FilterPanel';
import { FloatingMapActions } from '@/components/FloatingMapActions';
import { FloatingMapHeader } from '@/components/FloatingMapHeader';
import { MapToast } from '@/components/MapToast';
import { MapProvider } from '@/components/map/MapProvider';
import { listEvents, type EventQuery } from '@/data/events';
import { calculateHotAreas } from '@/lib/hot-areas';
import { isoDay } from '@/lib/time';
import { groupEventsByVenue, toVenueMarkers } from '@/lib/venues';
import { useLocation } from '@/hooks/use-location';
import { useLocationEnabled } from '@/hooks/use-location-enabled';
import { useTheme } from '@/theme/theme';

type Section = 'category' | 'quick' | 'sort';
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
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [quickFilters, setQuickFilters] = useState<QuickFilterId[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>(null);

  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [section, setSection] = useState<Section | null>('category');
  const [topH, setTopH] = useState(0);

  // „Jetzt" für den Live-Status, im Minutentakt aktualisiert.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Bei Tageswechsel (App über Mitternacht offen) „heute" mitführen, damit der
  // Live-Status einer laufenden Nacht nicht plötzlich verschwindet.
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

  // Live-Status nur für den heutigen Tag (bzw. die Wochenansicht) relevant.
  const liveContext = time === isoDay(now) || time === NEXT_7_DAYS;

  const query: EventQuery = {
    time,
    categorySlug,
    quickFilters,
    sort: 'date',
    origin: location,
    search: deferredSearch,
  };
  const { data } = useQuery({
    queryKey: ['events', query],
    queryFn: () => listEvents(query),
  });
  const events = useMemo(() => data ?? [], [data]);

  // Mehrere Events am selben Standort → eine Gruppe → ein Pin (mit Zahl).
  const groups = useMemo(() => groupEventsByVenue(events), [events]);
  const markers = useMemo(() => toVenueMarkers(groups, { now, liveContext }), [groups, now, liveContext]);
  // Dynamische Event-Dichte (weicher Glow) — aus den aktuellen Events.
  const hotAreas = useMemo(() => calculateHotAreas(events), [events]);
  const selectedGroup = useMemo(
    () => groups.find((g) => g.key === selectedKey) ?? null,
    [groups, selectedKey],
  );

  // Auswahl verwerfen, wenn die gewählte Venue-Gruppe (durch Datum/Filter/Suche)
  // aus dem Ergebnis fällt — verhindert ein „hängendes" Sheet auf totem Key.
  useEffect(() => {
    if (selectedKey && !groups.some((g) => g.key === selectedKey)) setSelectedKey(null);
  }, [groups, selectedKey]);

  // Beim Verlassen des Karten-Tabs offene Overlays schließen, damit ein Tab-Tap
  // keinen „offenen" Zustand hinterlässt (Sheet/Filter sind In-Screen-Overlays).
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedKey(null);
        setOpen(false);
      };
    }, []),
  );

  const toggleCategory = (slug: string) =>
    setCategorySlug((cur) => (cur === slug ? null : slug));

  const locate = async () => {
    const point = (await request()) ?? location;
    if (point) {
      // Tap = bewusster Opt-in → Settings-Schalter mitführen (sonst „bypassen"
      // wir die Einstellung). Standort-Symbol bleibt so auch konsistent sichtbar.
      if (!locationEnabled) setLocationEnabled(true);
      setFocus((f) => ({ point, nonce: (f?.nonce ?? 0) + 1, zoom: 15 }));
    } else {
      showToast('Standort nicht verfügbar — bitte in den Geräte-Einstellungen erlauben.');
    }
  };

  // Ist die Standort-Funktion (in den Einstellungen) aktiv, Standort holen,
  // damit das Symbol auf der Karte erscheint.
  useEffect(() => {
    if (locationEnabled && !location && status === 'idle') void request();
  }, [locationEnabled, location, status, request]);

  // Standort-Symbol zeigen, sobald wir eine Position haben (Button-getriebener
  // Opt-in ODER Einstellungs-Schalter). Vorher gab es keinen Punkt.
  const shownLocation = location;

  const toggleQuick = (id: QuickFilterId) => {
    setQuickFilters((cur) => (cur.includes(id) ? cur.filter((q) => q !== id) : [...cur, id]));
    if (id === 'near_me' && !quickFilters.includes('near_me') && !location) void locate();
  };

  const resetFilters = () => {
    setCategorySlug(null);
    setQuickFilters([]);
    setSearch('');
  };

  const activeCount = (categorySlug ? 1 : 0) + quickFilters.length + (deferredSearch ? 1 : 0);
  const hasActive = activeCount > 0;

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  const openEvent = (id: string) => {
    setSelectedKey(null);
    router.push(`/event/${id}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
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

      {/* Weiche Verläufe oben/unten — lassen die Overlays sanft in die Karte übergehen */}
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

      {/* Schwebende Top-Steuerung (Overlay über der Karte) */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + 6 }]}
        onLayout={(e) => setTopH(e.nativeEvent.layout.height)}
        pointerEvents="box-none">
        {/* Such-Button schwebt frei oben rechts — hält die Box ruhig */}
        <FloatingMapHeader searchOpen={open} hasActiveFilters={hasActive} onSearch={toggleOpen} />
        {/* Box: nur die Datumsleiste — Kategorie läuft über Suche/Filter */}
        <View style={[styles.panel, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <DateBar value={time} onChange={setTime} onOpenCalendar={() => setCalendarOpen(true)} />
        </View>
      </View>

      {/* Dezenter Hinweis (z. B. Standort-Fehler) über der Tab-Leiste */}
      <MapToast message={toast} bottom={insets.bottom + 100} />

      {/* „In meiner Nähe" — immer verfügbar (verstecken, wenn Sheet/Panel offen) */}
      {!selectedGroup && !open && (
        <FloatingMapActions located={!!location} onLocate={locate} bottom={insets.bottom + 92} />
      )}

      {/* Auswahl → Premium-Bottom-Sheet (ein Event oder mehrere am Standort) */}
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

      {/* Aufziehbares Glas-Filterpanel (identisch zu „Entdecken") */}
      {open && (
        <>
          <Pressable style={[styles.backdrop, { top: topH }]} onPress={toggleOpen} accessibilityLabel="Filter schließen" />
          <View style={[styles.panelWrap, { top: topH }]} pointerEvents="box-none">
            <FilterPanel
              search={search}
              onSearch={setSearch}
              categorySlug={categorySlug}
              onToggleCategory={toggleCategory}
              quickFilters={quickFilters}
              onToggleQuick={toggleQuick}
              showSort={false}
              openSection={section}
              onOpenSection={setSection}
              onReset={resetFilters}
              hasActive={hasActive}
            />
          </View>
        </>
      )}

      {/* Kalender-Overlay im Frame (schwebt über der Karte, Karte bleibt sichtbar) */}
      <DateOverlay
        visible={calendarOpen}
        value={time}
        onSelect={setTime}
        onClose={() => setCalendarOpen(false)}
      />
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
  panel: {
    // Datums-Box über die volle Breite
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    ...(Platform.select({
      web: { boxShadow: '0 6px 20px rgba(17,17,20,0.12)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#111114',
        shadowOpacity: 0.14,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      },
    }) as ViewStyle),
  },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.18)', zIndex: 25 },
  panelWrap: { position: 'absolute', left: 12, right: 12, zIndex: 30 },
});
