import { promises as fs } from 'fs';
import path from 'path';
import type { EventIngestionRun } from '@dots/shared';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Protokoll der Ingestion-Läufe (event_ingestion_runs). Ein Eintrag je Quellen-
 * Scan. Dual-Backend (Supabase / JSON-Demo).
 */

export interface RunResult {
  status: 'success' | 'failed';
  foundEventsCount: number;
  createdEventsCount: number;
  updatedEventsCount: number;
  logs: string;
  errorMessage?: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRun(row: any): EventIngestionRun {
  return {
    id: row.id,
    sourceId: row.source_id ?? null,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? null,
    logs: row.logs ?? null,
    foundEventsCount: row.found_events_count ?? 0,
    createdEventsCount: row.created_events_count ?? 0,
    updatedEventsCount: row.updated_events_count ?? 0,
    errorMessage: row.error_message ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'ingestion_runs.json');

async function readAll(): Promise<EventIngestionRun[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as EventIngestionRun[];
  } catch {
    return [];
  }
}
async function writeAll(rows: EventIngestionRun[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

/** Startet einen Lauf, gibt die run-id zurück. */
export async function startRun(sourceId: string | null): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('event_ingestion_runs')
      .insert({ source_id: sourceId, status: 'running' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }
  const id = crypto.randomUUID();
  const rows = await readAll();
  rows.push({
    id,
    sourceId,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logs: null,
    foundEventsCount: 0,
    createdEventsCount: 0,
    updatedEventsCount: 0,
    errorMessage: null,
  });
  await writeAll(rows);
  return id;
}

/** Schließt einen Lauf ab (Status + Zähler + Logs). */
export async function finishRun(runId: string, r: RunResult): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('event_ingestion_runs')
      .update({
        status: r.status,
        finished_at: new Date().toISOString(),
        logs: r.logs,
        found_events_count: r.foundEventsCount,
        created_events_count: r.createdEventsCount,
        updated_events_count: r.updatedEventsCount,
        error_message: r.errorMessage ?? null,
      })
      .eq('id', runId);
    if (error) throw error;
    return;
  }
  const rows = await readAll();
  const row = rows.find((x) => x.id === runId);
  if (row) {
    row.status = r.status;
    row.finishedAt = new Date().toISOString();
    row.logs = r.logs;
    row.foundEventsCount = r.foundEventsCount;
    row.createdEventsCount = r.createdEventsCount;
    row.updatedEventsCount = r.updatedEventsCount;
    row.errorMessage = r.errorMessage ?? null;
    await writeAll(rows);
  }
}

export async function listRuns(limit = 30): Promise<EventIngestionRun[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('event_ingestion_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapRun);
  }
  return (await readAll()).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}
