import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useThemePreference } from './use-theme-preference';

/**
 * Effektives Farbschema: folgt der gewählten Erscheinungsbild-Präferenz
 * ([[use-theme-preference]]); bei „system" das Geräteschema (wie bisher mit
 * Fallback auf Hell, wenn das System nichts meldet).
 */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const [preference] = useThemePreference();
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
