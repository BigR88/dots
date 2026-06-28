import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { AUTH_DISABLED, isSupabaseConfigured, supabase } from '@/data/supabase';

/**
 * Auth-Zustand der App. Kapselt Supabase Auth (E-Mail + Passwort) inkl.
 * Session-Persistenz. Solange keine Session da ist, zeigt das Root-Layout den
 * Anmelde-Screen (Gate); danach die App.
 */
interface AuthResult {
  error?: string;
  /** true, wenn nach Registrierung noch eine E-Mail-Bestätigung aussteht. */
  needsConfirmation?: boolean;
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  displayName: string | null;
  email: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Erlaubt Login/Registrierung mit bloßem Nutzernamen statt voller E-Mail:
 * "yannik" → "yannik@dots.app". Enthält die Eingabe bereits ein "@", bleibt sie
 * unverändert. So kann man sich mit einem einfachen Namen anmelden.
 */
export function toLoginEmail(input: string): string {
  const v = input.trim();
  return v.includes('@') ? v : `${v.toLowerCase().replace(/\s+/g, '')}@dots.app`;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    // Token-Refresh nur laufen lassen, solange die App im Vordergrund ist — so
    // bleibt die Session ohne erneutes Anmelden dauerhaft gültig (Supabase-
    // Empfehlung für React Native). Beim Mount ist die App aktiv → sofort starten.
    supabase.auth.startAutoRefresh();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase!.auth.startAutoRefresh();
      else supabase!.auth.stopAutoRefresh();
    });

    return () => {
      sub.subscription.unsubscribe();
      appState.remove();
      supabase!.auth.stopAutoRefresh();
    };
  }, []);

  // Profil-Zeile sicherstellen (RLS erlaubt self-insert). Nur einmalig anlegen.
  useEffect(() => {
    const user = session?.user;
    if (!user || !supabase) return;
    void supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          display_name: (user.user_metadata?.name as string) ?? user.email?.split('@')[0] ?? 'Gast',
        },
        { onConflict: 'id', ignoreDuplicates: true },
      )
      .then(() => undefined);
  }, [session?.user?.id]);

  const signIn: AuthState['signIn'] = async (email, password) => {
    if (!supabase) return { error: 'Kein Backend verbunden.' };
    const { error } = await supabase.auth.signInWithPassword({
      email: toLoginEmail(email),
      password,
    });
    return { error: error?.message };
  };

  const signUp: AuthState['signUp'] = async (name, email, password) => {
    if (!supabase) return { error: 'Kein Backend verbunden.' };
    const { data, error } = await supabase.auth.signUp({
      email: toLoginEmail(email),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return { error: error.message };
    // Ohne Session = E-Mail-Bestätigung ist im Supabase-Projekt aktiviert.
    if (!data.session) return { needsConfirmation: true };
    return {};
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  const user = session?.user;
  const value: AuthState = {
    session,
    loading,
    displayName: (user?.user_metadata?.name as string) ?? user?.email?.split('@')[0] ?? null,
    email: user?.email ?? null,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}

export { AUTH_DISABLED, isSupabaseConfigured };
