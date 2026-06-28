import { promises as fs } from 'fs';
import path from 'path';
import type { EventUpload, SourceKind } from '@dots/shared';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Hochgeladene Flyer/Screenshots (event_uploads) + deren Extraktionsergebnis.
 * Das Bild selbst wird bewusst NICHT öffentlich gespeichert (rechtlich:
 * kein Rehosting). Optionaler privater Storage-Bucket = TODO.
 * Dual-Backend (Supabase / JSON-Demo).
 */

export interface NewUpload {
  fileType: string | null;
  sourceKind: SourceKind;
  rawOcrText: string | null;
  extractedJson: unknown | null;
  status: EventUpload['status'];
  candidateId: string | null;
  fileUrl?: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapUpload(row: any): EventUpload {
  return {
    id: row.id,
    fileUrl: row.file_url ?? null,
    fileType: row.file_type ?? null,
    sourceKind: row.source_kind,
    rawOcrText: row.raw_ocr_text ?? null,
    extractedJson: row.extracted_json ?? null,
    status: row.status,
    candidateId: row.candidate_id ?? null,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'event_uploads.json');

async function readAll(): Promise<EventUpload[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as EventUpload[];
  } catch {
    return [];
  }
}
async function writeAll(rows: EventUpload[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

export async function insertUpload(u: NewUpload): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('event_uploads')
      .insert({
        file_url: u.fileUrl ?? null,
        file_type: u.fileType,
        source_kind: u.sourceKind,
        raw_ocr_text: u.rawOcrText,
        extracted_json: u.extractedJson ?? null,
        status: u.status,
        candidate_id: u.candidateId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }
  const rows = await readAll();
  const id = crypto.randomUUID();
  rows.push({
    id,
    fileUrl: u.fileUrl ?? null,
    fileType: u.fileType,
    sourceKind: u.sourceKind,
    rawOcrText: u.rawOcrText,
    extractedJson: u.extractedJson ?? null,
    status: u.status,
    candidateId: u.candidateId,
    createdAt: new Date().toISOString(),
  });
  await writeAll(rows);
  return id;
}

export async function listUploads(limit = 20): Promise<EventUpload[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('event_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapUpload);
  }
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
