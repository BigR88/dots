import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { AvatarRing } from './AvatarRing';

interface Props {
  name: string;
  avatarColor: string;
  subtitle?: string;
  /** Aktions-Element(e) rechts (z. B. Hinzufügen-Button, Status). */
  children?: ReactNode;
}

/**
 * Schlanke Personen-Zeile (Suchergebnis / gesendete Anfrage): Avatar, Name,
 * optionaler Zusatz und rechts ein Aktions-Slot.
 */
export function UserRow({ name, avatarColor, subtitle, children }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.row, softShadow, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <AvatarRing name={name} color={avatarColor} size={44} variant="soft" />
      <View style={styles.identity}>
        <Text numberOfLines={1} style={[styles.name, { color: t.colors.textPrimary }]}>
          {name}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: t.colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: '0 4px 16px rgba(17,24,39,0.05)' } as unknown as ViewStyle,
  default: {
    shadowColor: '#1F2A44',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
}) as ViewStyle;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
