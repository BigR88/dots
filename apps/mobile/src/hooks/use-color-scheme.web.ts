import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemePreference } from './use-theme-preference';

/**
 * Web-Variante: berücksichtigt die Erscheinungsbild-Präferenz
 * ([[use-theme-preference]]) und fällt bei „system" auf das Geräteschema zurück.
 * Vor der Hydration „light", damit Static Rendering stabil bleibt.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const system = useRNColorScheme();
  const [preference] = useThemePreference();

  if (!hasHydrated) return 'light';
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
