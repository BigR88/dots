import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { QuickFilterId } from '@dots/shared';
import { FilterPanel } from './FilterPanel';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type Section = 'category' | 'quick' | 'sort';

/**
 * Vereinheitlichtes Filter-Panel der Karte — EIN Einstieg (der Filter-Orb),
 * identisch zum Dashboard (FilterPanel: Suche + Kategorie + Schnellfilter).
 * Klappt als Dropdown unter der HUD-Kapsel auf: Spring von oben + Fade + Scale.
 * Tap auf den Backdrop schließt.
 */
export function MapFilterDropdown({
  top,
  search,
  onSearch,
  categorySlugs,
  onToggleCategory,
  quick,
  onToggleQuick,
  activeCount,
  onReset,
  onClose,
}: {
  top: number;
  search: string;
  onSearch: (v: string) => void;
  categorySlugs: string[];
  onToggleCategory: (slug: string) => void;
  quick: QuickFilterId[];
  onToggleQuick: (id: QuickFilterId) => void;
  activeCount: number;
  onReset: () => void;
  onClose: () => void;
}) {
  const ty = useRef(new Animated.Value(-14)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const [section, setSection] = useState<Section | null>('category');
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(ty, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, bounciness: 6, speed: 13 }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [ty, fade, scale]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(ty, { toValue: -14, duration: 150, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(scale, { toValue: 0.96, duration: 150, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(({ finished }) => {
      if (finished) onCloseRef.current();
    });
  }, [ty, fade, scale]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fade }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Filter schließen" />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { top, opacity: fade, transform: [{ translateY: ty }, { scale }] },
        ]}
        pointerEvents="box-none">
        <FilterPanel
          search={search}
          onSearch={onSearch}
          isCategoryActive={(s) => categorySlugs.includes(s)}
          activeCategoryLabel={categorySlugs.length ? `${categorySlugs.length} aktiv` : 'Alle'}
          onToggleCategory={onToggleCategory}
          quickFilters={quick}
          onToggleQuick={onToggleQuick}
          showSort={false}
          openSection={section}
          onOpenSection={setSection}
          onReset={onReset}
          hasActive={activeCount > 0}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,9,12,0.28)' },
  panel: { position: 'absolute', left: 12, right: 12 },
});
