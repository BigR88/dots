import { promises as fs } from 'fs';
import path from 'path';
import type { CheckFrequency, EventSource, SourceType } from '@dots/shared';
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
  active?: boolean;
  checkFrequency?: CheckFrequency;
  notes?: string | null;
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
    active: row.active ?? true,
    checkFrequency: row.check_frequency ?? 'manual',
    lastCheckedAt: row.last_checked_at ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
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
    const now = new Date().toISOString();
    const seed: EventSource[] = [
      {
        id: crypto.randomUUID(),
        type: 'manual',
        name: 'Manuelles Einfügen',
        url: null,
        organizerId: null,
        isTrusted: true,
        active: true,
        checkFrequency: 'manual',
        lastCheckedAt: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
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
    const row: Record<string, unknown> = {
      id: input.id || crypto.randomUUID(),
      type: input.type,
      name: input.name,
      url: input.url,
      is_trusted: input.isTrusted,
    };
    if (input.active !== undefined) row.active = input.active;
    if (input.checkFrequency !== undefined) row.check_frequency = input.checkFrequency;
    if (input.notes !== undefined) row.notes = input.notes;
    const { error } = await supabase.from('event_sources').upsert(row);
    if (error) throw error;
    return;
  }
  const rows = await readAll();
  const id = input.id || crypto.randomUUID();
  const existing = rows.find((s) => s.id === id);
  const now = new Date().toISOString();
  const next: EventSource = {
    id,
    type: input.type,
    name: input.name,
    url: input.url,
    organizerId: existing?.organizerId ?? null,
    isTrusted: input.isTrusted,
    active: input.active ?? existing?.active ?? true,
    checkFrequency: input.checkFrequency ?? existing?.checkFrequency ?? 'manual',
    lastCheckedAt: existing?.lastCheckedAt ?? null,
    notes: input.notes ?? existing?.notes ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const idx = rows.findIndex((s) => s.id === id);
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  await writeAll(rows);
}

/** last_checked_at nach einem Scan aktualisieren. */
export async function markSourceChecked(id: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('event_sources').update({ last_checked_at: now }).eq('id', id);
    if (error) throw error;
    return;
  }
  const rows = await readAll();
  const row = rows.find((s) => s.id === id);
  if (row) {
    row.lastCheckedAt = now;
    await writeAll(rows);
  }
}

export async function removeSource(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('event_sources').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  await writeAll((await readAll()).filter((s) => s.id !== id));
}
