import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DotsEvent } from '@dots/shared';
import { palette } from '@dots/shared';
import { toggleAttending, useIsAttending } from '@/hooks/use-attendance';
import { useAttendeeCount } from '@/hooks/use-attendee-count';
import { useFriendsAttendingEvent } from '@/hooks/use-friends';
import { useTheme } from '@/theme/theme';
import { Avatar } from './Avatar';
import { GlassCard } from './GlassCard';

/** Prominenter „Bin dabei!"-Block für den Event-Detail-Screen. */
export function AttendBar({ event }: { event: DotsEvent }) {
  const t = useTheme();
  const isAttending = useIsAttending(event.id);
  const friends = useFriendsAttendingEvent(event.id);
  const count = useAttendeeCount(event);

  return (
    <GlassCard shadow={false} style={styles.box}>
      <Pressable onPress={() => toggleAttending(event.id)}>
        {({ pressed }) => {
          const inner = (
            <>
              <Ionicons
                name={isAttending ? 'checkmark-circle' : 'add-circle-outline'}
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.btnText}>{isAttending ? 'Du bist dabei' : 'Bin dabei!'}</Text>
            </>
          );
          return isAttending ? (
            <View style={[styles.btn, { backgroundColor: palette.success, opacity: pressed ? 0.85 : 1 }]}>
              {inner}
            </View>
          ) : (
            <LinearGradient
              colors={t.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.btn, pressed && { opacity: 0.9 }]}>
              {inner}
            </LinearGradient>
          );
        }}
      </Pressable>

      <View style={styles.infoRow}>
        {friends.length > 0 && (
          <View style={styles.avatars}>
            {friends.slice(0, 3).map((f, i) => (
              <View key={f.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <Avatar name={f.name} color={f.color} size={24} />
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.infoText, { color: t.colors.textSecondary }]}>
          <Text style={{ fontWeight: '700', color: t.colors.textPrimary }}>{count}</Text> sind
          dabei
          {friends.length > 0 &&
            ` · ${friends.map((f) => f.name).join(', ')} ${friends.length === 1 ? 'geht' : 'gehen'} hin`}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, gap: 10 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: { fontSize: 15.5, fontWeight: '800', color: '#FFFFFF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  avatars: { flexDirection: 'row' },
  infoText: { fontSize: 13, flexShrink: 1 },
});
