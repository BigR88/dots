import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, QUICK_FILTERS, type QuickFilterId } from '@dots/shared';
import { useTheme } from '@/theme/theme';
import { FilterPill } from './FilterPill';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const CLOSED_Y = 720;

/**
 * Kompaktes, hochwertiges Filter-Bottom-Sheet für die Karte: Kategorie-Chips
 * (Mehrfachauswahl, farbig) + Schnellfilter + „Zurücksetzen". Slide-in von unten,
 * Drag-Handle, Tap außerhalb schließt. Suche ist bewusst NICHT hier.
 */
export function MapFilterSheet({
  categorySlugs,
  onToggleCategory,
  quick,
  onToggleQuick,
  activeCount,
  onReset,
  onClose,
}: {
  categorySlugs: string[];
  onToggleCategory: (slug: string) => void;
  quick: QuickFilterId[];
  onToggleQuick: (id: QuickFilterId) => void;
  activeCount: number;
  onReset: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const ty = useRef(new Animated.Value(CLOSED_Y)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(ty, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, bounciness: 5, speed: 13 }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [ty, fade]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(ty, { toValue: CLOSED_Y, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(({ finished }) => {
      if (finished) onCloseRef.current();
    });
  }, [ty, fade]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) ty.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) close();
        else Animated.spring(ty, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, bounciness: 4, speed: 14 }).start();
      },
    }),
  ).current;

  const bottom = insets.bottom + 96;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fade }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Filter schließen" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { bottom, backgroundColor: t.colors.surface, borderColor: t.colors.border, transform: [{ translateY: ty }] },
        ]}>
        <View {...pan.panHandlers} style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: t.colors.textMuted }]} />
        </View>

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>Filter</Text>
          {activeCount > 0 ? (
            <Pressable onPress={onReset} hitSlop={8} style={styles.reset}>
              <Ionicons name="refresh" size={14} color={t.colors.textSecondary} />
              <Text style={[styles.resetText, { color: t.colors.textSecondary }]}>Zurücksetzen</Text>
            </Pressable>
          ) : (
            <Pressable onPress={close} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={20} color={t.colors.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.scroll}>
          <Text style={[styles.section, { color: t.colors.textMuted }]}>Event-Art</Text>
          <View style={styles.pillWrap}>
            {CATEGORIES.map((c) => (
              <FilterPill
                key={c.slug}
                label={c.name}
                icon={c.icon}
                color={c.color}
                active={categorySlugs.includes(c.slug)}
                onPress={() => onToggleCategory(c.slug)}
              />
            ))}
          </View>

          <Text style={[styles.section, { color: t.colors.textMuted, marginTop: 16 }]}>Schnellfilter</Text>
          <View style={styles.pillWrap}>
            {QUICK_FILTERS.map((q) => (
              <FilterPill
                key={q.id}
                label={q.label}
                icon={q.icon}
                active={quick.includes(q.id)}
                onPress={() => onToggleQuick(q.id)}
              />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,9,12,0.28)' },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
    maxHeight: '72%',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  handleArea: { alignItems: 'center', paddingTop: 9, paddingBottom: 4 },
  handle: { width: 38, height: 5, borderRadius: 3, opacity: 0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 6 },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  close: { padding: 2 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 6 },
  resetText: { fontSize: 13.5, fontWeight: '700' },
  scroll: { paddingHorizontal: 18 },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
