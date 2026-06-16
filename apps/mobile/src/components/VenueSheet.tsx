import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { VenueGroup } from '@/lib/venues';
import { formatDay, formatPrice, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/theme';

/**
 * Bottom-Sheet für einen Standort mit MEHREREN Events: Venue-Name + Adresse und
 * eine chronologische Liste aller Events dort. Jede Zeile ist anklickbar und
 * führt zur Event-Detailseite. Clean, weiß, Lila nur als feiner Akzent.
 */
export function VenueSheet({
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
    <View
      style={[styles.wrap, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      {/* Kopf: Venue + Adresse */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.venue, { color: t.colors.textPrimary }]}>
            {group.venueName}
          </Text>
          {group.address ? (
            <Text numberOfLines={1} style={[styles.address, { color: t.colors.textSecondary }]}>
              {group.address}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={20} color={t.colors.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.count, { color: t.colors.textMuted }]}>
        {group.events.length} Events an diesem Standort
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} bounces={false}>
        {group.events.map((ev, i) => (
          <Pressable
            key={ev.id}
            onPress={() => onOpenEvent(ev.id)}
            style={({ pressed }) => [
              styles.eventRow,
              i > 0 && { borderTopColor: t.colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              pressed && { opacity: 0.6 },
            ]}>
            <View style={styles.when}>
              <Text style={[styles.whenDay, { color: t.colors.textSecondary }]}>{formatDay(ev.startAt)}</Text>
              <Text style={[styles.whenTime, { color: t.colors.textPrimary }]}>{formatTime(ev.startAt)}</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text numberOfLines={1} style={[styles.eventTitle, { color: t.colors.textPrimary }]}>
                {ev.title}
              </Text>
              <Text numberOfLines={1} style={[styles.eventMeta, { color: t.colors.textSecondary }]}>
                {ev.category?.name ?? 'Event'} · {formatPrice(ev)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 112,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    maxHeight: 360,
    shadowColor: '#111114',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  venue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  address: { fontSize: 13, marginTop: 1 },
  close: { padding: 2 },
  count: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8, marginBottom: 2 },
  list: { marginTop: 2 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  when: { width: 64 },
  whenDay: { fontSize: 11.5, fontWeight: '600' },
  whenTime: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, marginTop: 1 },
  eventInfo: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  eventMeta: { fontSize: 12.5 },
});
