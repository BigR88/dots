import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DotsEvent } from '@dots/shared';
import { palette } from '@dots/shared';
import { hexA } from '@/lib/color';
import { formatPrice, formatTime, isFree } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { FavoriteButton } from './FavoriteButton';
import { GlassCard } from './GlassCard';

interface Props {
  event: DotsEvent;
  onPress: () => void;
  /** Platzierung im Trend-Ranking (1-basiert) — Glanz-Badge auf dem Tile. */
  rank?: number;
}

/**
 * Event als hochwertige „Liquid Glass"-Karte: Gradient-Icon-Kachel, Meta/Titel/
 * Venue, Preis + Herz rechts, Social-Zeile unten. Press-Feedback per Scale.
 */
export function EventCard({ event, onPress, rank }: Props) {
  const t = useTheme();
  const color = event.category?.color ?? t.accent;
  const free = isFree(event);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, { transform: [{ scale: pressed ? 0.975 : 1 }] }]}>
      <GlassCard style={styles.card}>
        <View style={styles.body}>
          {/* Gradient-Kachel mit Kategorie-Icon + Glanz */}
          <View style={styles.tileWrap}>
            <LinearGradient
              colors={[hexA(color, 0.95), hexA(color, 0.7)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tile}>
              {event.coverImageUrl ? (
                <Image source={event.coverImageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name={(event.category?.icon ?? 'sparkles') as never} size={26} color="#fff" />
                </>
              )}
            </LinearGradient>
            {rank != null && (
              <View style={[styles.rank, { backgroundColor: t.accent, borderColor: t.colors.surface }]}>
                <Text style={styles.rankText}>{rank}</Text>
              </View>
            )}
          </View>

          {/* Inhalt */}
          <View style={styles.content}>
            <Text numberOfLines={1} style={[styles.meta, { color: t.colors.textMuted }]}>
              {formatTime(event.startAt)} Uhr
            </Text>
            <Text numberOfLines={2} style={[styles.title, { color: t.colors.textPrimary }]}>
              {event.title}
            </Text>
            <Text numberOfLines={1} style={[styles.venue, { color: t.colors.textSecondary }]}>
              {event.venue?.name ?? 'Frankfurt am Main'}
            </Text>
          </View>

          {/* Rechts: Preis oben, Herz darunter */}
          <View style={styles.right}>
            <View
              style={[
                styles.pricePill,
                free
                  ? { backgroundColor: hexA(palette.success, 0.16) }
                  : { backgroundColor: t.colors.surfaceElevated },
              ]}>
              <Text style={[styles.price, { color: free ? palette.success : t.colors.textPrimary }]}>
                {formatPrice(event)}
              </Text>
            </View>
            <FavoriteButton eventId={event.id} size={20} variant="plain" />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: 14 },
  card: {},
  body: { flexDirection: 'row', gap: 13, padding: 14, alignItems: 'flex-start' },
  tileWrap: { position: 'relative' },
  tile: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rank: {
    position: 'absolute',
    top: -6,
    left: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  rankText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  content: { flex: 1, gap: 3 },
  meta: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontSize: 17.5, fontWeight: '800', letterSpacing: -0.4, lineHeight: 22 },
  venue: { fontSize: 13.5, fontWeight: '500' },
  right: { alignItems: 'flex-end', gap: 12 },
  pricePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  price: { fontSize: 12.5, fontWeight: '800' },
});
