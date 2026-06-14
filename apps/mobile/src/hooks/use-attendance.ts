import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { queryClient } from '@/data/query-client';
import { fetchMyAttendance, setAttendance, type SocialStats } from '@/data/social';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/hooks/use-auth';

/**
 * „Bin dabei"-Zusagen. Mit Supabase laufen sie pro angemeldetem Nutzer über die
 * Tabelle `event_attendance`; ohne Backend (Demo) lokal wie die Favoriten.
 * Die Hook-API (useAttendingIds / useIsAttending / toggleAttending) bleibt für
 * beide Modi gleich.
 */

const STORAGE_KEY = 'dots.attending.v1';
const STATS_KEY = ['social-stats'] as const;

let attendingIds: ReadonlySet<string> = new Set();
let mode: 'demo' | 'live' = isSupabaseConfigured ? 'live' : 'demo';
let userId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  attendingIds = new Set(attendingIds); // neue Referenz → Re-Render
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (mode === 'demo') void hydrateDemo();
  return () => listeners.delete(listener);
}

function getSnapshot(): ReadonlySet<string> {
  return attendingIds;
}

// ── Demo-Persistenz (AsyncStorage) ──────────────────────────────────────────
let demoHydrated = false;
async function hydrateDemo() {
  if (demoHydrated || mode !== 'demo') return;
  demoHydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      attendingIds = new Set(JSON.parse(raw) as string[]);
      emit();
    }
  } catch {
    /* Demo: Lesefehler ignorieren */
  }
}

// ── Wechsel zwischen Nutzer/Modus (von useAttendanceSync aufgerufen) ─────────
export async function configureAttendance(nextUserId: string | null): Promise<void> {
  if (isSupabaseConfigured && nextUserId) {
    mode = 'live';
    userId = nextUserId;
    try {
      const ids = await fetchMyAttendance(nextUserId);
      attendingIds = new Set(ids);
      emit();
    } catch {
      /* Netzfehler: leere Zusagenliste, App bleibt nutzbar */
    }
  } else if (isSupabaseConfigured) {
    // Abgemeldet: lokalen Zustand leeren.
    mode = 'live';
    userId = null;
    attendingIds = new Set();
    emit();
  } else {
    mode = 'demo';
    userId = null;
    void hydrateDemo();
  }
}

// Optimistisch den Zähler in der Social-Stats-Query mitführen (sofortiges UI).
function patchCount(eventId: string, delta: number) {
  queryClient.setQueryData<SocialStats>(STATS_KEY, (old) => {
    if (!old) return old;
    const counts = { ...old.counts };
    counts[eventId] = Math.max(0, (counts[eventId] ?? 0) + delta);
    return { ...old, counts };
  });
}

export function toggleAttending(id: string): void {
  const willAttend = !attendingIds.has(id);
  const next = new Set(attendingIds);
  if (willAttend) next.add(id);
  else next.delete(id);
  attendingIds = next;
  emit();

  if (mode === 'live' && userId) {
    patchCount(id, willAttend ? 1 : -1);
    setAttendance(userId, id, willAttend)
      .then(() => {
        // Mit Server abgleichen (Zähler & Trending-Reihenfolge).
        void queryClient.invalidateQueries({ queryKey: STATS_KEY });
        void queryClient.invalidateQueries({ queryKey: ['events'] });
      })
      .catch(() => {
        // Rollback bei Fehler.
        const revert = new Set(attendingIds);
        if (willAttend) revert.delete(id);
        else revert.add(id);
        attendingIds = revert;
        emit();
        patchCount(id, willAttend ? -1 : 1);
      });
  } else {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  }
}

export function useAttendingIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useIsAttending(id: string): boolean {
  return useAttendingIds().has(id);
}

/** In der App einmal mounten: hält den Zusagen-Store mit der Session synchron. */
export function useAttendanceSync(): void {
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;
  useEffect(() => {
    void configureAttendance(uid);
  }, [uid]);
}
