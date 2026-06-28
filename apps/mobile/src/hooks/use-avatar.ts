import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useSyncExternalStore } from 'react';

/**
 * Profilbild — Demo-Modus: lokal auf dem Gerät gespeichert (AsyncStorage).
 * Hinterlegt wird eine Bild-URI bzw. data-URL aus dem Image-Picker. Sobald ein
 * Supabase-Storage-Bucket existiert, kann hier zusätzlich hochgeladen werden.
 *
 * Modul-Store (useSyncExternalStore), damit Profil-Kopf & Edit-Screen denselben
 * Zustand teilen und sich ein neu gewähltes Foto sofort überall zeigt.
 */
const STORAGE_KEY = 'dots.avatar.v1';

let avatar: string | null = null;
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
      avatar = raw;
      emit();
    }
  } catch {
    /* Lesefehler still ignorieren — kein Foto ist ein gültiger Zustand. */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  return avatar;
}

/**
 * Öffnet die Foto-Galerie (quadratischer Zuschnitt) und speichert das gewählte
 * Bild als Profilbild. Bricht still ab, wenn die Berechtigung fehlt oder nichts
 * gewählt wurde. Gibt `true` zurück, wenn ein Foto gesetzt wurde.
 */
export async function pickAvatar(): Promise<boolean> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return false;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return false;
  const asset = res.assets[0];
  // data-URL bevorzugen (überlebt App-Neustart im Demo-Modus); sonst URI.
  setAvatar(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
  return true;
}

/** Setzt das Profilbild (URI/data-URL) oder entfernt es mit `null`. */
export function setAvatar(uri: string | null): void {
  if (avatar === uri) return;
  avatar = uri;
  emit();
  if (uri) void AsyncStorage.setItem(STORAGE_KEY, uri).catch(() => {});
  else void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export function useAvatar(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
