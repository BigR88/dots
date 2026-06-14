import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { GlassButton } from './GlassButton';

interface Props {
  /** Standort-Funktion aktiv (Master-Schalter aus den Einstellungen). */
  locationEnabled: boolean;
  /** Standort aktuell bekannt (Symbol auf der Karte sichtbar). */
  located: boolean;
  onOpenSettings: () => void;
  onLocate: () => void;
  onRecenter: () => void;
  /** Abstand vom unteren Rand (über der schwebenden Tab-Bar). */
  bottom: number;
}

/**
 * Schwebende Karten-Aktionen rechts unten: Ansicht zentrieren, „mein Standort"
 * (nur wenn aktiv) und ein Einstellungs-Button, der zur Einstellungs-Seite
 * führt (dort Standort an/aus). Runde Buttons, liegen über der Karte und
 * schweben über der Tab-Bar.
 */
export function FloatingMapActions({
  locationEnabled,
  located,
  onOpenSettings,
  onLocate,
  onRecenter,
  bottom,
}: Props) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <GlassButton solid onPress={onRecenter} size={48} accessibilityLabel="Frankfurt zentrieren">
        <Ionicons name="expand-outline" size={21} color={t.colors.textPrimary} />
      </GlassButton>

      {/* „Mein Standort" — nur sinnvoll, wenn die Funktion aktiv ist */}
      {locationEnabled && (
        <GlassButton solid onPress={onLocate} size={48} accessibilityLabel="Mein Standort">
          <Ionicons
            name={located ? 'navigate' : 'navigate-outline'}
            size={20}
            color={located ? t.accent : t.colors.textPrimary}
          />
        </GlassButton>
      )}

      {/* Einstellungen öffnen (Standort aktivieren/deaktivieren) */}
      <GlassButton solid onPress={onOpenSettings} size={48} accessibilityLabel="Einstellungen">
        <Ionicons name="settings-outline" size={21} color={t.colors.textPrimary} />
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, alignItems: 'center', gap: 12, zIndex: 15 },
});
