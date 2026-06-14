import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Serverseitiger Supabase-Client für das Admin (Service-Role-Key umgeht RLS —
 * deshalb darf diese Datei NUR aus Server-Code (Store/Actions) importiert
 * werden, nie aus Client-Komponenten).
 *
 * Ohne gesetzte Env-Variablen bleibt der Admin im Demo-Modus
 * (JSON-Store, siehe store.ts).
 */

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && serviceRoleKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
