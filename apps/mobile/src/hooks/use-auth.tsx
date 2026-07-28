import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { AUTH_DISABLED, isSupabaseConfigured, supabase } from '@/data/supabase';

/** Persistenz für den Gast-Modus („Ohne Konto entdecken", Apple 5.1.1(ii)). */
const GUEST_KEY = 'dots.guest.v1';
/** Demo-Login (ohne Backend): lokal „angemeldeter" Nutzer für die Web-Demo. */
const DEMO_KEY = 'dots.demoUser.v1';

interface DemoUser {
  name: string;
  email: string;
}

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
  /** true = nutzt die App ohne Konto (Events browsen; Social ist gesperrt). */
  isGuest: boolean;
  /** true, sobald angemeldet — echte Supabase-Session ODER Demo-Login. */
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Löscht das eigene Konto endgültig (RPC delete_account, Migration 0009). */
  deleteAccount: () => Promise<AuthResult>;
  /** Gast-Modus betreten (Gate durchlassen) bzw. verlassen (zurück zum Login). */
  continueAsGuest: () => void;
  exitGuestMode: () => void;
  /** Registrierungs-Code aus der Mail prüfen (meldet nach Erfolg direkt an). */
  confirmSignUp: (email: string, code: string) => Promise<AuthResult>;
  /** Schickt die Passwort-zurücksetzen-Mail (mit 6-stelligem Code). */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Code aus der Mail prüfen und neues Passwort setzen (meldet auch an). */
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<AuthResult>;
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
  const [isGuest, setIsGuest] = useState(false);
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // Ohne Backend (Web-Demo): Gast-Flag und Demo-Login lokal laden, damit das
      // Gate nach einem Reload weiß, ob schon „angemeldet" wurde.
      void Promise.all([AsyncStorage.getItem(DEMO_KEY), AsyncStorage.getItem(GUEST_KEY)]).then(
        ([demo, guest]) => {
          if (demo) {
            try {
              setDemoUser(JSON.parse(demo) as DemoUser);
            } catch {
              /* kaputter Eintrag → ignorieren */
            }
          }
          setIsGuest(guest === '1');
          setLoading(false);
        },
      );
      return;
    }
    // Session und Gast-Flag zusammen laden, damit das Gate nicht flackert.
    void Promise.all([supabase.auth.getSession(), AsyncStorage.getItem(GUEST_KEY)]).then(
      ([{ data }, guestFlag]) => {
        setSession(data.session);
        setIsGuest(guestFlag === '1');
        setLoading(false);
      },
    );
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

  // Demo-Login setzen/entfernen (nur ohne Backend). Persistiert lokal.
  const setDemo = (user: DemoUser | null) => {
    setDemoUser(user);
    if (user) void AsyncStorage.setItem(DEMO_KEY, JSON.stringify(user)).catch(() => {});
    else void AsyncStorage.removeItem(DEMO_KEY).catch(() => {});
  };

  const signIn: AuthState['signIn'] = async (email, password) => {
    if (!supabase) {
      // Web-Demo ohne Backend: lokal „anmelden" (keine echte Prüfung).
      setDemo({ name: email.split('@')[0] || 'Du', email: toLoginEmail(email) });
      return {};
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: toLoginEmail(email),
      password,
    });
    return { error: error?.message };
  };

  const signUp: AuthState['signUp'] = async (name, email, password) => {
    if (!supabase) {
      // Web-Demo: direkt „registriert" (offline gibt es keinen E-Mail-Code).
      setDemo({ name: name.trim() || email.split('@')[0] || 'Du', email: toLoginEmail(email) });
      return {};
    }
    const { data, error } = await supabase.auth.signUp({
      email: toLoginEmail(email),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return { error: error.message };
    // Bereits registrierte E-Mail: Supabase liefert aus Enumeration-Schutz
    // KEINEN Fehler, sondern ein User-Objekt ohne identities — sonst würden
    // wir fälschlich "Bestätige deine E-Mail" anzeigen, obwohl keine Mail kommt.
    if (data.user && data.user.identities?.length === 0)
      return { error: 'User already registered' };
    // Ohne Session = E-Mail-Bestätigung ist im Supabase-Projekt aktiviert.
    if (!data.session) return { needsConfirmation: true };
    return {};
  };

  const signOut = async () => {
    // Auch den Gast-Modus beenden — nach dem Abmelden erscheint wieder das Gate.
    exitGuestMode();
    // Demo-Login löschen (Web-Demo) → Gate zeigt wieder Anmelden/Registrieren.
    if (demoUser) setDemo(null);
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    // Offline scheitert der globale Sign-out, BEVOR die lokale Session entfernt
    // wird — dann wenigstens lokal abmelden, damit der Nutzer nicht ohne
    // Rückmeldung eingeloggt bleibt.
    if (error) await supabase.auth.signOut({ scope: 'local' });
  };

  const deleteAccount: AuthState['deleteAccount'] = async () => {
    if (!supabase) return { error: 'Kein Backend verbunden.' };
    const { error } = await supabase.rpc('delete_account');
    if (error) return { error: error.message };
    // Konto ist serverseitig weg — Session nur noch lokal verwerfen (der
    // Server-Logout würde mit gelöschtem Nutzer fehlschlagen).
    exitGuestMode();
    await supabase.auth.signOut({ scope: 'local' });
    return {};
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    void AsyncStorage.setItem(GUEST_KEY, '1').catch(() => {});
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    void AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
  };

  const confirmSignUp: AuthState['confirmSignUp'] = async (email, code) => {
    if (!supabase) return { error: 'Kein Backend verbunden.' };
    // OTP-Flow ohne Deep Links: Der 6-stellige Code aus der Bestätigungs-Mail
    // ({{ .Token }} im Supabase-„Confirm signup"-Template) meldet direkt an.
    const { error } = await supabase.auth.verifyOtp({
      email: toLoginEmail(email),
      token: code.trim(),
      type: 'signup',
    });
    return { error: error?.message };
  };

  const resetPassword: AuthState['resetPassword'] = async (email) => {
    if (!supabase) return { error: 'Kein Backend verbunden.' };
    const { error } = await supabase.auth.resetPasswordForEmail(toLoginEmail(email));
    return { error: error?.message };
  };

  const confirmPasswordReset: AuthState['confirmPasswordReset'] = async (
    email,
    code,
    newPassword,
  ) => {
    if (!supabase) return { error: 'Kein Backend verbunden.' };
    // OTP-Flow ohne Deep Links: Der 6-stellige Code aus der Mail ({{ .Token }}
    // im Supabase-Template) meldet an, danach wird das Passwort gesetzt.
    const { error } = await supabase.auth.verifyOtp({
      email: toLoginEmail(email),
      token: code.trim(),
      type: 'recovery',
    });
    if (error) return { error: error.message };
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      // Nicht halb angemeldet stehen lassen: verifyOtp hat bereits eine Session
      // gesetzt — ohne Rollback würde das Gate den AuthScreen sofort ersetzen
      // und die Fehlermeldung wäre nie sichtbar (Passwort bliebe still alt).
      await supabase.auth.signOut({ scope: 'local' });
      return { error: updateError.message };
    }
    return {};
  };

  const user = session?.user;
  const value: AuthState = {
    session,
    loading,
    displayName:
      (user?.user_metadata?.name as string) ?? user?.email?.split('@')[0] ?? demoUser?.name ?? null,
    email: user?.email ?? demoUser?.email ?? null,
    isGuest,
    isAuthenticated: Boolean(session) || Boolean(demoUser),
    signIn,
    signUp,
    signOut,
    deleteAccount,
    continueAsGuest,
    exitGuestMode,
    confirmSignUp,
    resetPassword,
    confirmPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}

export { AUTH_DISABLED, isSupabaseConfigured };
