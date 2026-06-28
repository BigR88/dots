import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { FlatList, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuickFilterId, SortId, TimeValue } from '@dots/shared';
import { TRENDING } from '@dots/shared';
import { ActiveFilterBar } from '@/components/ActiveFilterBar';
import { DateBar } from '@/components/DateBar';
import { DateOverlay } from '@/components/DateOverlay';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { FilterPanel } from '@/components/FilterPanel';
import { GlassButton } from '@/components/GlassButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenGradient } from '@/components/ScreenGradient';
import { SkeletonCard } from '@/components/SkeletonCard';
import { listEvents, type EventQuery } from '@/data/events';
import { useLocation } from '@/hooks/use-location';
import { isoDay } from '@/lib/time';
import { useTheme } from '@/theme/theme';

type Section = 'category' | 'quick' | 'sort';

export default function DiscoverScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { location, request } = useLocation();

  const [time, setTime] = useState<TimeValue>(isoDay(new Date()));
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [quickFilters, setQuickFilters] = useState<QuickFilterId[]>([]);
  const [sort, setSort] = useState<SortId>('date');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [section, setSection] = useState<Section | null>('category');
  const [headerH, setHeaderH] = useState(0);

  const query: EventQuery = {
    time,
    categorySlug,
    quickFilters,
    sort,
    origin: location,
    search: deferredSearch,
  };
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['events', query],
    queryFn: () => listEvents(query),
  });

  const toggleCategory = (slug: string) =>
    setCategorySlug((cur) => (cur === slug ? null : slug));
  const toggleQuick = (id: QuickFilterId) => {
    setQuickFilters((cur) => (cur.includes(id) ? cur.filter((q) => q !== id) : [...cur, id]));
    if (id === 'near_me' && !quickFilters.includes('near_me') && !location) void request();
  };
  const changeSort = (s: SortId) => {
    setSort(s);
    if (s === 'distance' && !location) void request();
  };
  const resetFilters = () => {
    setCategorySlug(null);
    setQuickFilters([]);
    setSort('date');
    setSearch('');
  };

  const activeCount =
    (categorySlug ? 1 : 0) + quickFilters.length + (sort !== 'date' ? 1 : 0) + (deferredSearch ? 1 : 0);
  const hasActive = activeCount > 0;

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <ScreenBackground>
      <ScreenGradient />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
          {/* Header: Wortmarke + Claim + runder Glas-Button */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: t.colors.textPrimary }]}>
                Dashboard<Text style={{ color: t.accent }}>.</Text>
              </Text>
            </View>
            <View>
              <GlassButton
                icon={open ? 'close' : 'search'}
                onPress={toggleOpen}
                accessibilityLabel="Suchen & filtern"
              />
              {!open && hasActive && (
                <View
                  pointerEvents="none"
                  style={[styles.activeDot, { backgroundColor: t.accent, borderColor: t.colors.background }]}
                />
              )}
            </View>
          </View>

          <DateBar value={time} onChange={setTime} onOpenCalendar={() => setCalendarOpen(true)} />

          <ActiveFilterBar
            categorySlug={categorySlug}
            quickFilters={quickFilters}
            sort={sort}
            search={deferredSearch}
            onPress={toggleOpen}
          />
        </View>

        <FlatList
          data={data ?? []}
          keyExtractor={(e) => e.id}
          renderItem={({ item, index }) => (
            <EventCard
              event={item}
              rank={time === TRENDING ? index + 1 : undefined}
              onPress={() => router.push(`/event/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.listPad}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : deferredSearch ? (
              <EmptyState
                title="Keine Treffer"
                subtitle={`Zu „${deferredSearch}" gibt es in dieser Auswahl nichts. Probier einen anderen Begriff, Tab oder Filter.`}
              />
            ) : (
              <EmptyState
                title="Nichts gefunden"
                subtitle="Für diese Auswahl gibt es gerade keine Events. Probier einen anderen Tab oder Filter."
              />
            )
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
        />

        {/* Aufziehbares Glas-Filterpanel */}
        {open && (
          <>
            <Pressable
              style={[styles.backdrop, { top: headerH }]}
              onPress={toggleOpen}
              accessibilityLabel="Filter schließen"
            />
            <View style={[styles.panelWrap, { top: headerH }]} pointerEvents="box-none">
              <FilterPanel
                search={search}
                onSearch={setSearch}
                categorySlug={categorySlug}
                onToggleCategory={toggleCategory}
                quickFilters={quickFilters}
                onToggleQuick={toggleQuick}
                sort={sort}
                onChangeSort={changeSort}
                openSection={section}
                onOpenSection={setSection}
                onReset={resetFilters}
                hasActive={hasActive}
              />
            </View>
          </>
        )}
      </View>

      {/* Kalender-Overlay im Frame (schwebt über der Liste) */}
      <DateOverlay
        visible={calendarOpen}
        value={time}
        onSelect={setTime}
        onClose={() => setCalendarOpen(false)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  brand: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  activeDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  listPad: { paddingTop: 4 },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.18)' },
  panelWrap: { position: 'absolute', left: 12, right: 12 },
});
