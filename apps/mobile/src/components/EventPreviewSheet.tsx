import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DotsEvent, GeoPoint } from '@dots/shared';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { DistanceLabel } from './DistanceLabel';
import { GlassView } from './GlassView';
import { PriceBadge } from './PriceBadge';

// Vorschau-Card am unteren Rand, wenn ein Pin angetippt wurde (§7.2 / §7.5).
export function EventPreviewSheet({
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
    <GlassView intensity={75} style={styles.wrap}>
      <Pressable style={styles.row} onPress={onOpen}>
        <View style={[styles.thumb, { backgroundColor: color }]}>
          {event.coverImageUrl ? (
            <Image source={event.coverImageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <LinearGradient
                colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name={(event.category?.icon ?? 'sparkles') as never} size={24} color="#fff" />
            </>
          )}
        </View>

        <View style={styles.info}>
          <Text numberOfLines={1} style={[styles.title, { color: t.colors.textPrimary }]}>
            {event.title}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: t.colors.textSecondary }]}>
            {formatDateTime(event.startAt)} · {event.venue?.name ?? 'Frankfurt am Main'}
          </Text>
          <View style={styles.badges}>
            <PriceBadge event={event} />
            <DistanceLabel from={userLocation} to={event.location} size={12} />
          </View>
        </View>

        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={20} color={t.colors.textMuted} />
        </Pressable>
      </Pressable>

      <Pressable onPress={onOpen}>
        {({ pressed }) => (
          <LinearGradient
            colors={t.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cta, pressed && { opacity: 0.9 }]}>
            <Text style={[styles.ctaText, { color: '#fff' }]}>Details ansehen</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </LinearGradient>
        )}
      </Pressable>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 112,
    borderRadius: 20,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  meta: { fontSize: 13 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  close: { padding: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
  },
  ctaText: { fontWeight: '700', fontSize: 15 },
});
