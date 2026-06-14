import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Backend ist nur aktiv, wenn beide Env-Variablen gesetzt sind. Andernfalls
// läuft die App gegen lokale Fixtures (siehe data/events.ts).
export const isSupabaseConfigured = Boolean(url && anonKey);

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
