import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GlassButton } from './GlassButton';

interface Props {
  /** Standort-Funktion aktiv (Master-Schalter aus den Einstellungen). */
  locationEnabled: boolean;
  /** Standort aktuell bekannt (Symbol auf der Karte sichtbar). */
  located: boolean;
  onLocate: () => void;
  /** Abstand vom unteren Rand (über der schwebenden Tab-Bar). */
  bottom: number;
}

/**
 * Schwebende Karten-Aktion rechts unten: nur „mein Standort" (und auch nur,
 * wenn die Standort-Funktion in den Einstellungen aktiv ist). Bewusst minimal —
 * keine Zoom-/Einstellungs-Buttons, um die Karte ruhig zu halten.
 */
export function FloatingMapActions({ locationEnabled, located, onLocate, bottom }: Props) {
  const t = useTheme();
  if (!locationEnabled) return null;
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <GlassButton solid onPress={onLocate} size={48} accessibilityLabel="Mein Standort">
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
