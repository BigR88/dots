import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { GlassView } from '@/components/GlassView';
import { palette, useTheme } from '@/theme/theme';

export interface MemberTarget {
  id: string;
  name: string;
  color: string;
  isAdmin: boolean;
}

interface Props {
  member: MemberTarget | null;
  onClose: () => void;
  onToggleAdmin: (memberId: string, makeAdmin: boolean) => void;
  onRemove: (memberId: string) => void;
}

/**
 * Aktionen zu einem Mitglied — erscheint erst beim Antippen der Zeile: Admin-
 * Rechte vergeben/entziehen (Admins dürfen schreiben & Mitglieder verwalten)
 * und aus der Gruppe entfernen. Inline-Overlay wie die übrigen Sheets.
 */
export function MemberActionsSheet({ member, onClose, onToggleAdmin, onRemove }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!member) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />

        <View style={styles.head}>
          <Avatar name={member.name} color={member.color} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: t.colors.textPrimary }]}>{member.name}</Text>
            <Text style={[styles.role, { color: t.colors.textMuted }]}>
              {member.isAdmin ? 'Admin' : 'Mitglied'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: t.colors.textPrimary }]}>Als Admin festlegen</Text>
              <Text style={[styles.rowHint, { color: t.colors.textMuted }]}>
                Admins dürfen schreiben und Mitglieder verwalten.
              </Text>
            </View>
            <Switch
              value={member.isAdmin}
              onValueChange={(v) => onToggleAdmin(member.id, v)}
              trackColor={{ false: t.colors.border, true: t.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Pressable
          onPress={() => onRemove(member.id)}
          accessibilityLabel={`${member.name} entfernen`}
          style={({ pressed }) => [
            styles.removeBtn,
            { borderColor: t.colors.border, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name="person-remove-outline" size={18} color={palette.danger} />
          <Text style={[styles.removeText, { color: palette.danger }]}>Aus Gruppe entfernen</Text>
        </Pressable>

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
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  name: { fontSize: 17, fontWeight: '800' },
  role: { fontSize: 12.5, marginTop: 1 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowHint: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  removeText: { fontSize: 15, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
