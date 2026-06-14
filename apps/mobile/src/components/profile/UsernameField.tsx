import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { palette, useTheme } from '@/theme/theme';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  status: UsernameStatus;
  message?: string | null;
}

/** Eingabe für den eindeutigen @username inkl. Live-Status (frei/vergeben/ungültig). */
export function UsernameField({ value, onChangeText, status, message }: Props) {
  const t = useTheme();
  const ok = status === 'available';
  const bad = status === 'taken' || status === 'invalid';
  const borderColor = ok ? palette.success : bad ? palette.danger : t.colors.border;

  return (
    <View style={styles.wrap}>
      <View style={[styles.field, { backgroundColor: t.colors.surface, borderColor }]}>
        <Text style={[styles.at, { color: t.colors.textMuted }]}>@</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="username"
          placeholderTextColor={t.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: t.colors.textPrimary }]}
        />
        {status === 'checking' && <ActivityIndicator size="small" color={t.colors.textMuted} />}
        {ok && <Ionicons name="checkmark-circle" size={20} color={palette.success} />}
        {bad && <Ionicons name="close-circle" size={20} color={palette.danger} />}
      </View>
      {message ? (
        <Text style={[styles.msg, { color: ok ? palette.success : bad ? palette.danger : t.colors.textMuted }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  at: { fontSize: 16, fontWeight: '800' },
  input: { flex: 1, fontSize: 15.5, padding: 0, outlineWidth: 0 },
  msg: { fontSize: 12.5, marginLeft: 2 },
});
