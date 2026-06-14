import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Master-Schalter „eigenen Standort auf der Karte zeigen".
 * Steuert, ob das Standort-Symbol auf der Karte erscheint und der Standort
 * aktiv geholt wird. Lokal gespeichert (AsyncStorage), standardmäßig AUS
 * (DSGVO-konformer Opt-in). Getrennt von [[use-location-sharing]], das die
 * Sichtbarkeit für Freunde regelt.
 *
 * Als Modul-Store (useSyncExternalStore) umgesetzt, damit Karte und
 * Einstellungs-Seite denselben Zustand live teilen.
 */
const STORAGE_KEY = 'dots.location_enabled.v1';

let enabled = false;
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
    if (raw != null && raw === '1') {
      enabled = true;
      emit();
    }
  } catch {
    // Demo-Modus: Lesefehler still ignorieren, Funktion startet AUS.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return enabled;
}

export function setLocationEnabled(next: boolean): void {
  if (enabled === next) return;
  enabled = next;
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0').catch(() => {});
}

export function useLocationEnabled(): readonly [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [value, setLocationEnabled] as const;
}
