import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Favoriten — Demo-Modus: lokal auf dem Gerät gespeichert (AsyncStorage,
 * im Web localStorage). Sobald Auth/Supabase verbunden ist, wandert der
 * Bestand in die `favorites`-Tabelle; die Hook-API bleibt gleich.
 */

const STORAGE_KEY = 'dots.favorites.v1';

let favoriteIds: ReadonlySet<string> = new Set();
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
    if (raw) {
      favoriteIds = new Set(JSON.parse(raw) as string[]);
      emit();
    }
  } catch {
    // Demo-Modus: Lesefehler still ignorieren, Favoriten starten leer.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): ReadonlySet<string> {
  return favoriteIds;
}

export function toggleFavorite(id: string): void {
  const next = new Set(favoriteIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  favoriteIds = next;
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
}

/** Reaktives Set aller favorisierten Event-IDs. */
export function useFavoriteIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useIsFavorite(id: string): boolean {
  return useFavoriteIds().has(id);
}
