import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DotsEvent, GeoPoint, QuickFilterId, TimeTabId } from '@dots/shared';
import { EventPreviewSheet } from '@/components/EventPreviewSheet';
import { FilterPanel } from '@/components/FilterPanel';
import { FloatingMapActions } from '@/components/FloatingMapActions';
import { FloatingMapHeader } from '@/components/FloatingMapHeader';
import { MapProvider } from '@/components/map/MapProvider';
import { TimeTabs } from '@/components/TimeTabs';
import { listEvents, type EventQuery } from '@/data/events';
import { useSocialStats } from '@/hooks/use-attendee-count';
import { useLocation } from '@/hooks/use-location';
import { useLocationEnabled } from '@/hooks/use-location-enabled';
import { FRANKFURT_CENTER } from '@/lib/geo';
import { useTheme } from '@/theme/theme';

type Section = 'category' | 'quick' | 'sort';
type Focus = { point: GeoPoint; nonce: number; zoom?: number } | null;

// Stabile leere Referenz (verhindert unnötige Re-Renders, wenn noch keine Stats da sind).
const EMPTY_COUNTS: Record<string, number> = {};

// Verlaufsfarbe für die Rand-Scrims (hell bzw. dunkel passend zum Schema).
const scrim = (scheme: 'light' | 'dark', alpha: number) =>
  `rgba(${scheme === 'dark' ? '11,11,15' : '255,255,255'}, ${alpha})`;

export default function MapScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { location, status, request } = useLocation();
  const [locationEnabled] = useLocationEnabled();

  const [tab, setTab] = useState<TimeTabId>('today');
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [quickFilters, setQuickFilters] = useState<QuickFilterId[]>([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selected, setSelected] = useState<DotsEvent | null>(null);
  const [focus, setFocus] = useState<Focus>(null);

  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section | null>('category');
  const [topH, setTopH] = useState(0);

  const query: EventQuery = {
    tab,
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

  // Zusagen je Event (für die farbige Zone um die Pins: mehr Zusagen → größer/intensiver).
  const stats = useSocialStats();
  const attendance = stats.data?.counts ?? EMPTY_COUNTS;

  const toggleCategory = (slug: string) =>
    setCategorySlug((cur) => (cur === slug ? null : slug));

  const locate = async () => {
    const point = (await request()) ?? location;
    if (point) setFocus((f) => ({ point, nonce: (f?.nonce ?? 0) + 1 }));
  };
  const recenter = () =>
    setFocus((f) => ({ point: FRANKFURT_CENTER, nonce: (f?.nonce ?? 0) + 1, zoom: 12.5 }));

  // Ist die Standort-Funktion (in den Einstellungen) aktiv, Standort holen,
  // damit das Symbol auf der Karte erscheint.
  useEffect(() => {
    if (locationEnabled && !location && status === 'idle') void request();
  }, [locationEnabled, location, status, request]);

  // Symbol nur zeigen, wenn die Standort-Funktion aktiv ist.
  const shownLocation = locationEnabled ? location : null;

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

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
      {/* Vollbild-Satellitenkarte */}
      <View style={StyleSheet.absoluteFill}>
        <MapProvider
          events={events}
          userLocation={shownLocation}
          selectedId={selected?.id ?? null}
          onSelectEvent={setSelected}
          focus={focus}
          attendance={attendance}
        />
      </View>

      {/* Weiche Verläufe oben/unten — lassen die Overlays sanft in die Karte übergehen */}
      <LinearGradient
        pointerEvents="none"
        colors={[scrim(t.scheme, 0.7), scrim(t.scheme, 0)]}
        style={[styles.topScrim, { height: insets.top + 150 }]}
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
        {/* Durchscheinende, schwebende Box — Milchglas, die Karte bleibt sichtbar */}
        <View style={[styles.panel, { borderColor: t.colors.border }]}>
          <BlurView
            intensity={32}
            tint={t.scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: t.scheme === 'dark' ? 'rgba(23,24,28,0.45)' : 'rgba(255,255,255,0.55)' },
            ]}
          />
          <FloatingMapHeader searchOpen={open} hasActiveFilters={hasActive} onSearch={toggleOpen} />
          <TimeTabs separate value={tab} onChange={setTab} />
        </View>
      </View>

      {/* Schwebende Karten-Aktionen (verstecken, wenn Sheet/Panel offen) */}
      {!selected && !open && (
        <FloatingMapActions
          locationEnabled={locationEnabled}
          located={!!location}
          onOpenSettings={() => router.push('/settings')}
          onLocate={locate}
          onRecenter={recenter}
          bottom={insets.bottom + 92}
        />
      )}

      {/* Vorschau-Sheet bei ausgewähltem Pin */}
      {selected && (
        <EventPreviewSheet
          event={selected}
          userLocation={shownLocation}
          onOpen={() => router.push(`/event/${selected.id}`)}
          onClose={() => setSelected(null)}
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
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    overflow: 'hidden',
    ...(Platform.select({
      web: { boxShadow: '0 16px 36px rgba(0,0,0,0.5)' } as unknown as ViewStyle,
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      },
    }) as ViewStyle),
  },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.18)', zIndex: 25 },
  panelWrap: { position: 'absolute', left: 12, right: 12, zIndex: 30 },
});
