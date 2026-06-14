import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Datenschutz-Einstellung „Freunde dürfen meinen Standort sehen".
 * Vorerst lokal gespeichert (AsyncStorage), standardmäßig AUS. Die spätere
 * Verknüpfung mit dem Backend (Standort-Sichtbarkeit für Freunde) ändert nur
 * die Persistenz, nicht die API dieses Hooks.
 *
 * Als Modul-Store (useSyncExternalStore), damit Profil und Einstellungs-Seite
 * denselben Zustand live teilen.
 */
const STORAGE_KEY = 'dots.share_location.v1';

let shared = false;
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
    if (raw === '1') {
      shared = true;
      emit();
    }
  } catch {
    // Demo-Modus: Lesefehler still ignorieren, Standardwert AUS.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return shared;
}

export function setLocationSharing(next: boolean): void {
  if (shared === next) return;
  shared = next;
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0').catch(() => {});
}

export function useLocationSharing(): readonly [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [value, setLocationSharing] as const;
}
