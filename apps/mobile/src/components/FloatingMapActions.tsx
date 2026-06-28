import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GlassButton } from './GlassButton';

interface Props {
  /** Standort aktuell bekannt (Symbol auf der Karte sichtbar, Button aktiv). */
  located: boolean;
  onLocate: () => void;
  /** Abstand vom unteren Rand (über der schwebenden Tab-Bar). */
  bottom: number;
}

/**
 * Schwebende Karten-Aktion rechts unten: „In meiner Nähe". Immer verfügbar —
 * der Tap ist der Standort-Opt-in (Berechtigung wird dann angefragt). Aktiver
 * Zustand (Lila), sobald eine Position bekannt ist. Bewusst minimal.
 */
export function FloatingMapActions({ located, onLocate, bottom }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <GlassButton solid onPress={onLocate} size={48} accessibilityLabel="In meiner Nähe">
        <Ionicons
          name={located ? 'navigate' : 'navigate-outline'}
          size={20}
          color={located ? t.accent : t.colors.textPrimary}
        />
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, alignItems: 'center', gap: 12, zIndex: 15 },
});
