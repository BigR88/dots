import { promises as fs } from 'fs';
import path from 'path';
import {
  CATEGORY_BY_SLUG,
  type Category,
  type CandidateStatus,
  type DotsEvent,
  type ExtractedEvent,
  type ImportedEventCandidate,
  type PriceType,
  type SourceKind,
} from '@dots/shared';
import { isSupabaseConfigured, supabase } from './supabase';
import { getVenues } from './refdata';
import { saveEvent } from './store';
import { berlinWallToUtcIso } from './importer/time';

/**
 * Review-Queue der KI-Kandidaten. Zwei Backends hinter einer API (wie store.ts):
 *  - Supabase (Service-Role): echte Tabelle imported_event_candidates + RPCs.
 *  - Demo: JSON-Datei .data/candidates.json (kein Supabase nötig).
 * Die KI-Extraktion (Anthropic) braucht in BEIDEN Fällen den ANTHROPIC_API_KEY.
 */

export interface NewCandidate {
  sourceId: string | null;
  sourceKind: SourceKind | null;
  sourceName: string | null;
  rawInput: string | null;
  rawImagePath: string | null;
  extracted: ExtractedEvent;
  confidenceScore: number;
  possibleDuplicateOf: string | null;
  missingFields: string[];
  warnings: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCandidate(row: any): ImportedEventCandidate {
  return {
    id: row.id,
    sourceId: row.source_id ?? null,
    status: row.status,
    rawInput: row.raw_input ?? null,
    rawImagePath: row.raw_image_path ?? null,
    extracted: (row.extracted ?? {}) as ExtractedEvent,
    confidenceScore: Number(row.confidence_score ?? 0),
    possibleDuplicateOf: row.possible_duplicate_of ?? null,
    missingFields: row.missing_fields ?? [],
    warnings: row.warnings ?? [],
    sourceKind: row.source_kind ?? null,
    sourceName: row.source_name ?? null,
    reviewNote: row.review_note ?? null,
    promotedEventId: row.promoted_event_id ?? null,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── JSON-Demo-Backend ───────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'candidates.json');

async function readAll(): Promise<ImportedEventCandidate[]> {
  try {
    const rows = JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as ImportedEventCandidate[];
    // Defensiv normalisieren (alte/teilweise editierte JSON-Datensätze → keine NaN/undefined in der UI).
    return rows.map((r) => ({
      ...r,
      confidenceScore: Number(r.confidenceScore ?? 0),
      missingFields: r.missingFields ?? [],
      warnings: r.warnings ?? [],
      extracted: (r.extracted ?? {}) as ExtractedEvent,
    }));
  } catch {
    return [];
  }
}

async function writeAll(rows: ImportedEventCandidate[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

// ── Öffentliche API ─────────────────────────────────────────────────────────
export async function listCandidates(status?: CandidateStatus): Promise<ImportedEventCandidate[]> {
  if (isSupabaseConfigured && supabase) {
    let q = supabase.from('imported_event_candidates').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapCandidate);
  }
  const rows = await readAll();
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCandidate(id: string): Promise<ImportedEventCandidate | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('imported_event_candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCandidate(data) : null;
  }
  return (await readAll()).find((r) => r.id === id) ?? null;
}

/** Legt einen Kandidaten an und gibt seine id zurück. */
export async function insertCandidate(c: NewCandidate): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('imported_event_candidates')
      .insert({
        source_id: c.sourceId,
        source_kind: c.sourceKind,
        source_name: c.sourceName,
        status: 'pending',
        raw_input: c.rawInput,
        raw_image_path: c.rawImagePath,
        extracted: c.extracted,
        confidence_score: c.confidenceScore,
        possible_duplicate_of: c.possibleDuplicateOf,
        missing_fields: c.missingFields,
        warnings: c.warnings,
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
    sourceId: c.sourceId,
    sourceKind: c.sourceKind,
    sourceName: c.sourceName,
    status: 'pending',
    rawInput: c.rawInput,
    rawImagePath: c.rawImagePath,
    extracted: c.extracted,
    confidenceScore: c.confidenceScore,
    possibleDuplicateOf: c.possibleDuplicateOf,
    missingFields: c.missingFields,
    warnings: c.warnings,
    reviewNote: null,
    promotedEventId: null,
    createdAt: new Date().toISOString(),
  });
  await writeAll(rows);
  return id;
}

function normTitle(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Bereits in der Queue (pending/approved) liegender Kandidat zum selben Event?
 * Verhindert, dass Re-Scans denselben Event mehrfach einreihen. Vergleicht
 * normalisierten Titel + Startzeit (±2 h).
 */
export async function findDuplicateCandidate(title: string, startIso: string): Promise<string | null> {
  const nt = normTitle(title);
  if (!nt) return null;
  const startMs = new Date(startIso).getTime();
  const sameStart = (other: string | null | undefined): boolean => {
    if (!other) return false;
    const t = new Date(other).getTime();
    return !Number.isNaN(t) && !Number.isNaN(startMs) && Math.abs(t - startMs) <= 2 * 60 * 60 * 1000;
  };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('imported_event_candidates')
      .select('id, extracted, status')
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    for (const r of (data ?? []) as any[]) {
      const ex = r.extracted ?? {};
      if (normTitle(ex.title) === nt && sameStart(ex.start_datetime)) return r.id;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return null;
  }
  const rows = await readAll();
  for (const r of rows) {
    if (
      (r.status === 'pending' || r.status === 'approved') &&
      normTitle(r.extracted?.title) === nt &&
      sameStart(r.extracted?.start_datetime)
    ) {
      return r.id;
    }
  }
  return null;
}

/** Liefert die ID eines möglichen Duplikat-Events (oder null). */
export async function findDuplicate(title: string, startIso: string): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('find_duplicate_events', {
      in_title: title,
      in_start_at: startIso,
    });
    if (error) throw error;
    const first = Array.isArray(data) ? data[0] : null;
    return first?.id ?? null;
  }
  return null; // Demo: keine Duplikatprüfung gegen den getrennten Events-Store.
}

export async function updateCandidateStatus(
  id: string,
  status: CandidateStatus,
  opts: { note?: string | null; possibleDuplicateOf?: string | null } = {},
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const patch: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
    if (opts.note !== undefined) patch.review_note = opts.note;
    if (opts.possibleDuplicateOf !== undefined) patch.possible_duplicate_of = opts.possibleDuplicateOf;
    const { error } = await supabase.from('imported_event_candidates').update(patch).eq('id', id);
    if (error) throw error;
    return;
  }
  const rows = await readAll();
  const row = rows.find((r) => r.id === id);
  if (row) {
    row.status = status;
    if (opts.note !== undefined) row.reviewNote = opts.note;
    if (opts.possibleDuplicateOf !== undefined) row.possibleDuplicateOf = opts.possibleDuplicateOf;
    await writeAll(rows);
  }
}

/** Kandidat → echtes Event. Live via RPC (atomar), Demo lokal. */
export async function promoteCandidate(
  id: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('promote_candidate', {
      in_candidate_id: id,
      in_overrides: overrides,
    });
    if (error) throw error;
    return data as string;
  }

  // ── Demo-Promote ──────────────────────────────────────────────────────────
  const rows = await readAll();
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error('Kandidat nicht gefunden.');
  const ex = { ...row.extracted, ...(overrides as Partial<ExtractedEvent>) } as ExtractedEvent & {
    venue_id?: string;
  };
  if (!ex.title) throw new Error('Titel fehlt.');
  if (!ex.start_datetime) throw new Error('start_datetime fehlt — Datum vor der Freigabe ergänzen.');

  const startDate = new Date(ex.start_datetime);
  if (Number.isNaN(startDate.getTime())) throw new Error('start_datetime ist kein gültiges Datum.');
  const eventId = crypto.randomUUID();
  const startAt = startDate.toISOString();
  const endDate = ex.end_datetime ? new Date(ex.end_datetime) : null;
  const endAt = endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : null;

  const venues = await getVenues();
  const venueName = ex.venue_name?.toLowerCase().trim();
  const venue =
    venues.find((v) => v.id === ex.venue_id) ??
    venues.find((v) => venueName && v.name.toLowerCase().includes(venueName)) ??
    null;

  const price = parsePrice(ex.price_text);
  const event: DotsEvent = {
    id: eventId,
    title: ex.title,
    description: ex.description || ex.short_description || null,
    status: 'pending_review',
    startAt,
    endAt,
    doorsAt: null,
    venueId: venue?.id ?? null,
    venue,
    location: venue?.location ?? null,
    addressOverride: ex.address || null,
    categoryId: ex.category || null,
    category: categoryFor(ex.category),
    musicGenre: ex.music_genre || null,
    vibeTags: [],
    priceType: price.priceType,
    priceMin: price.priceMin,
    priceMax: null,
    currency: 'EUR',
    ageRestriction: ex.min_age ? Number(ex.min_age.replace(/[^0-9]/g, '')) || null : null,
    coverImageUrl: null,
    ticketUrl: httpUrl(ex.ticket_url),
    externalUrl: httpUrl(ex.source_url),
    organizerId: null,
    organizer: null,
    sourceUrl: httpUrl(ex.source_url),
    popularityScore: 0,
    favoritesCount: 0,
  };
  await saveEvent(event);

  row.status = 'approved';
  row.promotedEventId = eventId;
  await writeAll(rows);
  return eventId;
}

// ── Helfer ──────────────────────────────────────────────────────────────────
function categoryFor(slug: string | null): Category | null {
  const d = slug ? CATEGORY_BY_SLUG[slug] : undefined;
  if (!d) return null;
  return { id: slug as string, slug: slug as string, name: d.name, icon: d.icon, color: d.color, sortOrder: 0, isActive: true };
}

function parsePrice(price: string | null): { priceType: PriceType; priceMin: number | null } {
  const p = (price || '').toLowerCase();
  if (/free|frei|kostenlos|gratis|umsonst/.test(p)) return { priceType: 'free', priceMin: null };
  const m = price?.match(/[0-9][0-9.,]*/);
  if (!m) return { priceType: price?.trim() ? 'paid' : 'unknown', priceMin: null };
  const raw = m[0];
  let numeric: string;
  if (raw.includes(',')) {
    numeric = raw.replace(/\./g, '').replace(',', '.'); // dt.: '.' Tausender, ',' Dezimal
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    numeric = raw.replace(/\./g, ''); // reine Tausendergruppen: 1.500
  } else {
    numeric = raw; // '.' als Dezimaltrenner belassen: 10.50 / 12
  }
  const n = Number(numeric);
  if (!Number.isFinite(n) || n < 0 || n > 999999.99) return { priceType: 'paid', priceMin: null };
  return { priceType: 'paid', priceMin: n };
}

/** Nur http(s)-URLs zulassen (kein javascript:/data: in die App). */
function httpUrl(u: string | undefined | null): string | null {
  return u && /^https?:\/\//i.test(u) ? u : null;
}
