import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { DotsEvent } from '@dots/shared';
import { palette } from '@dots/shared';
import { useIsAttending } from '@/hooks/use-attendance';
import { useAttendeeCount } from '@/hooks/use-attendee-count';
import { useFriendsAttendingEvent } from '@/hooks/use-friends';
import { hexA } from '@/lib/color';
import { useTheme } from '@/theme/theme';

/** Kompakte Social-Proof-Zeile: Zähler + Freund:innen + „Du bist dabei"-Pill. */
export function AttendInfo({ event }: { event: DotsEvent }) {
  const t = useTheme();
  const isAttending = useIsAttending(event.id);
  const friends = useFriendsAttendingEvent(event.id);
  const count = useAttendeeCount(event);

  return (
    <View style={styles.row}>
      <Ionicons name="people" size={13} color={t.colors.textMuted} />
      <Text numberOfLines={1} style={[styles.text, { color: t.colors.textSecondary }]}>
        {count} dabei
        {friends.length > 0 ? `  ·  ${friends.map((f) => f.name).join(' & ')}` : ''}
      </Text>
      {isAttending && (
        <View style={[styles.pill, { backgroundColor: hexA(palette.success, 0.16) }]}>
          <Ionicons name="checkmark-circle" size={12} color={palette.success} />
          <Text style={[styles.pillText, { color: palette.success }]}>Du bist dabei</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  text: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillText: { fontSize: 11, fontWeight: '800' },
});
