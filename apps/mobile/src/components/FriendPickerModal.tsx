import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXTURE_FRIENDS } from '@dots/shared';
import { isSupabaseConfigured } from '@/data/supabase';
import { useFriendOverview } from '@/hooks/use-friends';
import { colorFromId } from '@/lib/avatar-color';
import { useTheme } from '@/theme/theme';
import { Avatar } from './Avatar';
import { GlassView } from './GlassView';

export interface PickableFriend {
  id: string;
  name: string;
  color: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (friend: PickableFriend) => void;
}

/**
 * Bottom-Sheet zur Freund:innen-Auswahl beim Teilen eines Events.
 * Live kommen die echten Freunde aus `friend_overview`, sonst die Fixtures.
 * Bewusst kein RN-<Modal>: das portalt im Web ans Browser-Root und würde aus
 * dem iPhone-Rahmen der Vorschau ausbrechen — als Inline-Overlay bleibt es drin.
 */
export function FriendPickerModal({ visible, onClose, onPick }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const overview = useFriendOverview();

  const friends: PickableFriend[] = isSupabaseConfigured
    ? (overview.data?.friends ?? []).map((f) => ({ id: f.id, name: f.name, color: colorFromId(f.id) }))
    : FIXTURE_FRIENDS.map((f) => ({ id: f.id, name: f.name, color: f.color }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>Mit wem teilen?</Text>

        {friends.length === 0 ? (
          <Text style={[styles.empty, { color: t.colors.textSecondary }]}>
            Noch keine Freund:innen. Füge im Freunde-Tab welche hinzu, um Events zu teilen.
          </Text>
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {friends.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => onPick(f)}
                style={[styles.row, { borderColor: t.colors.border }]}
                accessibilityLabel={`An ${f.name} senden`}>
                <Avatar name={f.name} color={f.color} size={36} />
                <Text style={[styles.name, { color: t.colors.textPrimary }]}>{f.name}</Text>
                <Ionicons name="paper-plane-outline" size={18} color={t.accent} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: t.colors.textSecondary }]}>Abbrechen</Text>
        </Pressable>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 12 },
  list: { maxHeight: 320 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
