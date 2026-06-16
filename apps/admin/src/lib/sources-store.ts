import { promises as fs } from 'fs';
import path from 'path';
import type { EventSource, SourceType } from '@dots/shared';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Quellen-Verwaltung (event_sources) — die vom Nutzer kuratierte Liste, aus der
 * der Agent Events zieht. Dual-Backend wie store.ts (Supabase / JSON-Demo).
 */

export interface SourceInput {
  id?: string;
  type: SourceType;
  name: string;
  url: string | null;
  isTrusted: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSource(row: any): EventSource {
  return {
    id: row.id,
    type: row.type,
    name: row.name ?? null,
    url: row.url ?? null,
    organizerId: row.organizer_id ?? null,
    isTrusted: row.is_trusted ?? false,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── JSON-Demo-Backend ───────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'sources.json');

async function readAll(): Promise<EventSource[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as EventSource[];
  } catch {
    const seed: EventSource[] = [
      {
        id: crypto.randomUUID(),
        type: 'manual',
        name: 'Manuelles Einfügen',
        url: null,
        organizerId: null,
        isTrusted: true,
        createdAt: new Date().toISOString(),
      },
    ];
    await writeAll(seed);
    return seed;
  }
}

async function writeAll(rows: EventSource[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

// ── Öffentliche API ─────────────────────────────────────────────────────────
export async function listSources(): Promise<EventSource[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('event_sources').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapSource);
  }
  return (await readAll()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getSource(id: string): Promise<EventSource | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('event_sources').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapSource(data) : null;
  }
  return (await readAll()).find((s) => s.id === id) ?? null;
}

export async function saveSource(input: SourceInput): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const row = {
      id: input.id || crypto.randomUUID(),
      type: input.type,
      name: input.name,
      url: input.url,
      is_trusted: input.isTrusted,
    };
    const { error } = await supabase.from('event_sources').upsert(row);
    if (error) throw error;
    return;
  }
  const rows = await readAll();
  const id = input.id || crypto.randomUUID();
  const existing = rows.find((s) => s.id === id);
  const next: EventSource = {
    id,
    type: input.type,
    name: input.name,
    url: input.url,
    organizerId: existing?.organizerId ?? null,
    isTrusted: input.isTrusted,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const idx = rows.findIndex((s) => s.id === id);
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  await writeAll(rows);
}

export async function removeSource(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('event_sources').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  await writeAll((await readAll()).filter((s) => s.id !== id));
}
