import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { CATEGORIES, QUICK_FILTERS, type QuickFilterId } from '@dots/shared';
import { useTheme } from '@/theme/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Premium-Filter-Sheet der Karte — klappt als Glas-Karte unter der HUD-Kapsel
 * auf. Suche, Kategorie-Chips (Farbe = Kategorie) und Schnellfilter; unten
 * Zurücksetzen + „Events anzeigen". Filter wirken sofort (live Vorschau auf der
 * Karte hinter dem Panel), der CTA schließt nur.
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
  const t = useTheme();
  const dark = t.scheme === 'dark';
  const ty = useRef(new Animated.Value(-14)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
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

  const hasActive = activeCount > 0 || search.length > 0;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: fade }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Filter schließen" />
      </Animated.View>

      <Animated.View
        style={[styles.panelWrap, { top, opacity: fade, transform: [{ translateY: ty }, { scale }] }, panelShadow]}
        pointerEvents="box-none">
        <BlurView
          intensity={44}
          tint={dark ? 'dark' : 'light'}
          style={[styles.panel, { borderColor: t.colors.glassBorder }]}>
          {/* Deckschicht: expo-blur (Web) setzt eine eigene, zu dünne Tint-Fläche —
              ohne diese Schicht scheinen Marker durchs Panel und der Text säuft ab. */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: dark ? 'rgba(23,24,28,0.85)' : 'rgba(255,255,255,0.85)' },
            ]}
          />
          {/* Suche */}
          <View
            style={[
              styles.search,
              { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,20,0.05)' },
            ]}>
            <Ionicons name="search" size={16} color={t.colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder="Events, Orte, Vibes suchen …"
              placeholderTextColor={t.colors.textMuted}
              style={[styles.searchInput, { color: t.colors.textPrimary }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => onSearch('')} hitSlop={8} accessibilityLabel="Suche löschen">
                <Ionicons name="close-circle" size={16} color={t.colors.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Kategorien — Chipfarbe = Kategoriefarbe (gleiche Sprache wie die Pins) */}
            <Text style={[styles.section, { color: t.colors.textMuted }]}>Kategorien</Text>
            <View style={styles.wrap}>
              {CATEGORIES.map((c) => {
                const active = categorySlugs.includes(c.slug);
                return (
                  <Pressable
                    key={c.slug}
                    onPress={() => onToggleCategory(c.slug)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.chip,
                      active
                        ? { backgroundColor: c.color, borderColor: c.color }
                        : {
                            backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,20,0.04)',
                            borderColor: 'transparent',
                          },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : c.color }]} />
                    <Text style={[styles.chipLabel, { color: active ? '#fff' : t.colors.textPrimary }]}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Schnellfilter */}
            <Text style={[styles.section, { color: t.colors.textMuted }]}>Schnellfilter</Text>
            <View style={styles.wrap}>
              {QUICK_FILTERS.map((q) => {
                const active = quick.includes(q.id);
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => onToggleQuick(q.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.chip,
                      active
                        ? { backgroundColor: t.accent, borderColor: t.accent }
                        : {
                            backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,20,0.04)',
                            borderColor: 'transparent',
                          },
                      pressed && { opacity: 0.8 },
                    ]}>
                    <Ionicons
                      name={`${q.icon}-outline` as never}
                      size={13}
                      color={active ? '#fff' : t.colors.textSecondary}
                    />
                    <Text style={[styles.chipLabel, { color: active ? '#fff' : t.colors.textPrimary }]}>
                      {q.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Aktionen */}
          <View style={styles.footer}>
            {hasActive ? (
              <Pressable
                onPress={onReset}
                style={({ pressed }) => [styles.reset, pressed && { opacity: 0.7 }]}>
                <Text style={[styles.resetLabel, { color: t.colors.textSecondary }]}>Zurücksetzen</Text>
              </Pressable>
            ) : (
              <View style={styles.reset} />
            )}
            <Pressable style={styles.ctaFlex} onPress={close} accessibilityLabel="Events anzeigen">
              {({ pressed }) => (
                <LinearGradient
                  colors={t.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.cta, pressed && { opacity: 0.9 }]}>
                  <Text style={styles.ctaLabel}>Events anzeigen</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const panelShadow = Platform.select({
  web: { boxShadow: '0 18px 48px rgba(10,10,20,0.30)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#0A0A14',
    shadowOpacity: 0.3,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,9,12,0.28)' },
  panelWrap: { position: 'absolute', left: 12, right: 12, borderRadius: 24 },
  panel: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    overflow: 'hidden',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', paddingVertical: 0 },
  scroll: { maxHeight: 340 },
  section: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  reset: { minWidth: 96, paddingVertical: 12, alignItems: 'center' },
  resetLabel: { fontSize: 13.5, fontWeight: '700' },
  ctaFlex: { flex: 1 },
  cta: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
});
