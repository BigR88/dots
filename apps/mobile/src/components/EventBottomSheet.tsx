import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DotsEvent, GeoPoint } from '@dots/shared';
import { formatDay, formatPrice, formatTime } from '@/lib/format';
import type { VenueGroup } from '@/lib/venues';
import { useTheme } from '@/theme/theme';
import { CategoryBadge } from './CategoryBadge';
import { DistanceLabel } from './DistanceLabel';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const CLOSED_Y = 720; // weit unterhalb des Bildschirms (für Slide-out)

/**
 * Premium-Bottom-Sheet beim Tippen auf einen Marker.
 * - Ein Event  → reiche Event-Card (Badge, Genre, Datum/Zeit, Preis, Tags, CTA).
 * - Mehrere    → Venue-Kopf + vergleichbare Event-Cards (Zeit, Genre, Preis, Tags).
 * Slide-in von unten, Drag-Handle zum Wegwischen, Tap außerhalb schließt.
 */
export function EventBottomSheet({
  group,
  userLocation,
  onOpenEvent,
  onClose,
}: {
  group: VenueGroup;
  userLocation: GeoPoint | null;
  onOpenEvent: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const single = group.events.length === 1 ? group.events[0] : null;

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

  // Drag-Handle: nach unten ziehen schließt; sonst zurück-federn.
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

  const bottom = insets.bottom + 96; // klar über der schwebenden Tab-Leiste (Oberkante ~ insets+64)

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop — Tap schließt */}
      <Animated.View style={[styles.backdrop, { opacity: fade }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Schließen" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            bottom,
            backgroundColor: t.colors.surface,
            borderColor: t.colors.border,
            transform: [{ translateY: ty }],
          },
        ]}>
        {/* Drag-Handle (Pan-Bereich) */}
        <View {...pan.panHandlers} style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: t.colors.textMuted }]} />
        </View>

        {single ? (
          <SingleEvent event={single} userLocation={userLocation} onOpen={() => onOpenEvent(single.id)} onClose={close} />
        ) : (
          <MultiEvents group={group} onOpenEvent={onOpenEvent} onClose={close} />
        )}
      </Animated.View>
    </View>
  );
}

/* ── Ein Event ──────────────────────────────────────────────────────────────*/
function SingleEvent({
  event,
  userLocation,
  onOpen,
  onClose,
}: {
  event: DotsEvent;
  userLocation: GeoPoint | null;
  onOpen: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const color = event.category?.color ?? t.accent;

  return (
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <View style={[styles.thumb, { backgroundColor: color }]}>
          {event.coverImageUrl ? (
            <Image source={event.coverImageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name={(event.category?.icon ?? 'sparkles') as never} size={26} color="#fff" />
          )}
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <CategoryBadge category={event.category} />
            <PopularityPill score={event.popularityScore} />
          </View>
          <Text numberOfLines={2} style={[styles.title, { color: t.colors.textPrimary }]}>
            {event.title}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color={t.colors.textSecondary} />
            <Text numberOfLines={1} style={[styles.location, { color: t.colors.textSecondary }]}>
              {event.venue?.name ?? 'Frankfurt am Main'}
            </Text>
          </View>
        </View>

        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={20} color={t.colors.textMuted} />
        </Pressable>
      </View>

      <View style={[styles.metaRow, { borderColor: t.colors.border }]}>
        <Meta icon="calendar-outline" text={formatDay(event.startAt)} />
        <Meta icon="time-outline" text={`${formatTime(event.startAt)} Uhr`} />
        {event.musicGenre ? <Meta icon="musical-notes-outline" text={event.musicGenre} /> : null}
        <Meta icon="pricetag-outline" text={formatPrice(event)} accent={event.priceType === 'free'} />
      </View>

      {event.description ? (
        <Text numberOfLines={2} style={[styles.desc, { color: t.colors.textSecondary }]}>
          {event.description}
        </Text>
      ) : null}

      <TagRow event={event} />

      {userLocation && event.location ? (
        <View style={styles.distanceRow}>
          <DistanceLabel from={userLocation} to={event.location} size={12} />
        </View>
      ) : null}

      <Pressable onPress={onOpen}>
        {({ pressed }) => (
          <LinearGradient
            colors={t.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cta, pressed && { opacity: 0.9 }]}>
            <Text style={styles.ctaText}>Details ansehen</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

/* ── Mehrere Events am selben Standort ──────────────────────────────────────*/
function MultiEvents({
  group,
  onOpenEvent,
  onClose,
}: {
  group: VenueGroup;
  onOpenEvent: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.title, { color: t.colors.textPrimary }]}>
            {group.venueName}
          </Text>
          <Text style={[styles.count, { color: t.colors.textMuted }]}>
            {group.events.length} Events an diesem Standort
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={20} color={t.colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} bounces={false}>
        {group.events.map((ev, i) => (
          <Pressable
            key={ev.id}
            onPress={() => onOpenEvent(ev.id)}
            style={({ pressed }) => [
              styles.eventCard,
              { backgroundColor: t.colors.surfaceElevated },
              i > 0 && { marginTop: 8 },
              pressed && { opacity: 0.7 },
            ]}>
            <View style={[styles.timePill, { backgroundColor: (ev.category?.color ?? t.accent) + '22' }]}>
              <Text style={[styles.timePillText, { color: ev.category?.color ?? t.accent }]}>
                {formatTime(ev.startAt)}
              </Text>
            </View>
            <View style={styles.eventInfo}>
              <Text numberOfLines={1} style={[styles.eventTitle, { color: t.colors.textPrimary }]}>
                {ev.title}
              </Text>
              <Text numberOfLines={1} style={[styles.eventMeta, { color: t.colors.textSecondary }]}>
                {[ev.category?.name, ev.musicGenre, formatPrice(ev)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/* ── Bausteine ──────────────────────────────────────────────────────────────*/
function Meta({ icon, text, accent }: { icon: keyof typeof Ionicons.glyphMap; text: string; accent?: boolean }) {
  const t = useTheme();
  const color = accent ? '#20C978' : t.colors.textSecondary;
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.metaText, { color }]}>{text}</Text>
    </View>
  );
}

function PopularityPill({ score }: { score: number }) {
  const t = useTheme();
  if (score < 60) return null;
  const label = score >= 80 ? 'Sehr beliebt' : 'Beliebt';
  return (
    <View style={[styles.pop, { backgroundColor: t.accent + '1E' }]}>
      <Ionicons name="flame" size={12} color={t.accent} />
      <Text style={[styles.popText, { color: t.accent }]}>{label}</Text>
    </View>
  );
}

function TagRow({ event }: { event: DotsEvent }) {
  const t = useTheme();
  const tags = event.vibeTags.slice(0, 4);
  if (tags.length === 0) return null;
  return (
    <View style={styles.tags}>
      {tags.map((tag) => (
        <View key={tag} style={[styles.tag, { backgroundColor: t.colors.surfaceElevated }]}>
          <Text style={[styles.tagText, { color: t.colors.textSecondary }]}>{tag}</Text>
        </View>
      ))}
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
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  handleArea: { alignItems: 'center', paddingTop: 9, paddingBottom: 6 },
  handle: { width: 38, height: 5, borderRadius: 3, opacity: 0.5 },
  body: { paddingHorizontal: 16, gap: 12 },

  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerInfo: { flex: 1, gap: 5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 13, fontWeight: '500', flex: 1 },
  close: { padding: 2 },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, fontWeight: '600' },

  desc: { fontSize: 13.5, lineHeight: 19 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  tagText: { fontSize: 11.5, fontWeight: '600' },

  distanceRow: { flexDirection: 'row' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 14,
    marginTop: 2,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15.5, letterSpacing: -0.2 },

  pop: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  popText: { fontSize: 11.5, fontWeight: '800' },

  count: { fontSize: 12.5, fontWeight: '700', marginTop: 3 },
  list: { maxHeight: 300 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  timePill: { minWidth: 56, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
  timePillText: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  eventMeta: { fontSize: 12.5 },
});
