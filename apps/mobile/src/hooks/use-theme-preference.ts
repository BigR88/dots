import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * App-Erscheinungsbild: dem System folgen, oder fest Hell/Dunkel wählen.
 * Lokal gespeichert (AsyncStorage), Default „system". Modul-Store
 * (useSyncExternalStore), damit alle Screens dieselbe Wahl live teilen — die
 * effektive Auflösung passiert in [[use-color-scheme]].
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'dots.theme_preference.v1';

let preference: ThemePreference = 'system';
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'system' || raw === 'light' || raw === 'dark') {
      preference = raw;
      emit();
    }
  } catch {
    /* Lesefehler ignorieren — Default „system" bleibt. */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): ThemePreference {
  return preference;
}

export function setThemePreference(next: ThemePreference): void {
  if (preference === next) return;
  preference = next;
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
}

export function useThemePreference(): readonly [ThemePreference, (next: ThemePreference) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [value, setThemePreference] as const;
}
