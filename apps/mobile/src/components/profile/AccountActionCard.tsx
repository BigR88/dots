import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, useTheme } from '@/theme/theme';

export interface AccountAction {
  icon: string;
  label: string;
  onPress: () => void;
  /** Danger-Aktion (z. B. Abmelden) — rot, aber clean. */
  danger?: boolean;
}

/** Account-Aktionen als gruppierte Karten-Zeilen (z. B. Bearbeiten, Abmelden). */
export function AccountActionCard({ actions }: { actions: AccountAction[] }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      {actions.map((a, i) => (
        <View key={a.label}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: t.colors.border }]} />}
          <Pressable
            onPress={a.onPress}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons
              name={a.icon as never}
              size={19}
              color={a.danger ? palette.danger : t.colors.textPrimary}
            />
            <Text
              style={[styles.label, { color: a.danger ? palette.danger : t.colors.textPrimary }]}>
              {a.label}
            </Text>
            {!a.danger && <Ionicons name="chevron-forward" size={17} color={t.colors.textMuted} />}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  label: { flex: 1, fontSize: 15.5, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth },
});
