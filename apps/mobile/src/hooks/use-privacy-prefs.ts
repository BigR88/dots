import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Privatsphäre-Präferenzen, die (noch) keine serverseitige Durchsetzung haben.
 * Sie werden lokal gespeichert (echte, gemerkte Auswahl) — die eigentliche
 * Durchsetzung folgt mit dem Backend-Rollout. Bewusst getrennt von
 * `useLocationSharing` (Standort für Freunde), das bereits real wirkt.
 *
 * Modul-Store (useSyncExternalStore), damit Profil & ggf. spätere Screens
 * denselben Zustand teilen.
 */
export type PrivacyKey = 'discoverable' | 'show_attendance' | 'profile_visible';

const STORAGE_KEY = 'dots.privacy_prefs.v1';
const DEFAULTS: Record<PrivacyKey, boolean> = {
  discoverable: true,
  show_attendance: true,
  profile_visible: true,
};

let prefs: Record<PrivacyKey, boolean> = { ...DEFAULTS };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  prefs = { ...prefs };
  listeners.forEach((l) => l());
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      prefs = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Record<PrivacyKey, boolean>>) };
      emit();
    }
  } catch {
    /* Lesefehler ignorieren — Defaults bleiben. */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): Record<PrivacyKey, boolean> {
  return prefs;
}

export function setPrivacyPref(key: PrivacyKey, value: boolean): void {
  if (prefs[key] === value) return;
  prefs = { ...prefs, [key]: value };
  emit();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)).catch(() => {});
}

export function usePrivacyPrefs(): Record<PrivacyKey, boolean> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
