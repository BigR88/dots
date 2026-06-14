import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * App-Sprache (Deutsch/Englisch). Lokal gespeichert, Default Deutsch.
 * Modul-Store, damit alle Screens dieselbe Auswahl teilen und sofort reagieren.
 *
 * Hinweis: Aktuell ist die Einstellungs-Seite voll übersetzt; weitere Screens
 * folgen schrittweise über dieselbe i18n-Schicht ([[i18n]]).
 */
export type Language = 'de' | 'en';

const STORAGE_KEY = 'dots.language.v1';

let lang: Language = 'de';
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
    if (raw === 'de' || raw === 'en') {
      lang = raw;
      emit();
    }
  } catch {
    /* Lesefehler ignorieren — Default „de" bleibt. */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): Language {
  return lang;
}

export function setLanguage(next: Language): void {
  if (lang === next) return;
  lang = next;
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
}

export function useLanguage(): readonly [Language, (next: Language) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [value, setLanguage] as const;
}
