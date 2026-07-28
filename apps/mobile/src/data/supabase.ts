import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Backend ist nur aktiv, wenn beide Env-Variablen gesetzt sind. Andernfalls
// läuft die App gegen lokale Fixtures (siehe data/events.ts).
export const isSupabaseConfigured = Boolean(url && anonKey);

// Dev-Schalter: Login-Gate überspringen, um ohne Konto an der App zu arbeiten.
// Greift NUR in Dev-Builds (__DEV__) — ein Release-/Store-Build kann das Gate
// damit nie versehentlich offen lassen, selbst wenn die Variable gesetzt ist.
// (Die öffentliche Web-Demo läuft ohne Supabase-Config und braucht den Schalter
// nicht: ohne Backend zeigt das Root-Layout ohnehin kein Gate.) Anonyme Nutzer
// dürfen laut RLS veröffentlichte Events/Venues lesen, daher bleibt die Karte
// auch ohne Login nutzbar.
export const AUTH_DISABLED = __DEV__ && process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';

// SSR-sicherer Speicher: Beim serverseitigen Rendern (Expo Web, Node) gibt es
// kein `window` — dort In-Memory, sonst AsyncStorage (Browser=localStorage,
// Native=Gerätespeicher). Verhindert "window is not defined" beim Start.
const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
  };
})();

const authStorage = typeof window === 'undefined' ? memoryStorage : AsyncStorage;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
