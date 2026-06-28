import {
  REQUIRED_FIELDS,
  type EventSource,
  type ExtractedEvent,
  type SourceKind,
  type SourceType,
} from '@dots/shared';
import { extractEvents, type ExtractInput } from './extract';
import { fetchWebsite } from './fetchers/website';
import { findDuplicate, findDuplicateCandidate, insertCandidate } from '../candidates-store';
import { listSources, markSourceChecked } from '../sources-store';
import { finishRun, startRun } from '../runs-store';

/** Max. Quellen pro Cron-Lauf (Schutz gegen maxDuration-Überschreitung). */
const MAX_SOURCES_PER_RUN = 10;

/**
 * Ingest-Pipeline: Rohinput/Quelle → (Claude-)Extraktion → Zukunfts-Filter →
 * Pflichtfeld-/Duplikatprüfung → Insert in die Review-Queue (status pending).
 * Promotet NICHTS automatisch — die Freigabe macht der Mensch im Review.
 */

export interface IngestSummary {
  extracted: number;
  imported: number;
  skippedPast: number;
  skippedDuplicate: number;
  invalid: number;
  /** IDs der angelegten Kandidaten (für Upload→Kandidat-Verknüpfung). */
  candidateIds: string[];
}

type InsertOutcome = { id: string } | { skip: 'past' | 'duplicate' };

export interface IngestContext {
  sourceId?: string | null;
  sourceKind?: SourceKind | null;
  sourceName?: string | null;
}

function missingFields(e: ExtractedEvent): string[] {
  const computed = REQUIRED_FIELDS.filter(
    (f) => !String((e as Record<string, unknown>)[f] ?? '').trim(),
  );
  return [...new Set([...computed, ...(e.missing_fields ?? [])])];
}

/** Vergangen, wenn der (sichere) Startzeitpunkt > 1 Tag zurückliegt. */
function isPast(e: ExtractedEvent): boolean {
  if (!e.start_datetime) return false; // unsicheres Datum → Mensch entscheidet
  const t = new Date(e.start_datetime).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now() - 24 * 60 * 60 * 1000;
}

/** Ein Event als Kandidat einreihen — überspringt Vergangenes & Queue-Duplikate. */
async function insertOne(
  e: ExtractedEvent,
  ctx: IngestContext,
  rawInput: string | null,
): Promise<InsertOutcome> {
  if (isPast(e)) return { skip: 'past' };
  // Bereits in der Queue (Re-Scan)? → nicht erneut einreihen.
  if (e.start_datetime && (await findDuplicateCandidate(e.title ?? '', e.start_datetime))) {
    return { skip: 'duplicate' };
  }
  const dup = e.start_datetime ? await findDuplicate(e.title ?? '', e.start_datetime) : null;
  const id = await insertCandidate({
    sourceId: ctx.sourceId ?? null,
    sourceKind: ctx.sourceKind ?? null,
    sourceName: ctx.sourceName ?? null,
    rawInput,
    rawImagePath: null,
    extracted: e,
    confidenceScore: e.confidence_score ?? 0,
    possibleDuplicateOf: dup,
    missingFields: missingFields(e),
    warnings: e.warnings ?? [],
  });
  return { id };
}

/** Manueller Import (Text/Plakat) → Kandidaten. */
export async function ingest(input: ExtractInput, ctx: IngestContext = {}): Promise<IngestSummary> {
  const { events, invalidCount } = await extractEvents(input);
  const candidateIds: string[] = [];
  let skippedPast = 0;
  let skippedDuplicate = 0;
  for (const e of events) {
    const r = await insertOne(e, ctx, input.text ?? null);
    if ('id' in r) candidateIds.push(r.id);
    else if (r.skip === 'past') skippedPast++;
    else skippedDuplicate++;
  }
  return {
    extracted: events.length,
    imported: candidateIds.length,
    skippedPast,
    skippedDuplicate,
    invalid: invalidCount,
    candidateIds,
  };
}

function sourceKindFor(type: SourceType): SourceKind {
  if (type === 'api' || type === 'official_api') return 'api';
  if (type === 'organizer' || type === 'partner_submission') return 'organizer_portal';
  return 'website';
}

const SCANNABLE_TYPES: SourceType[] = ['website', 'rss', 'ical', 'api', 'official_api', 'organizer'];

/** Ist eine Quelle laut Frequenz + letztem Check fällig? */
function isDue(s: EventSource): boolean {
  if (!s.active || !s.url || !SCANNABLE_TYPES.includes(s.type)) return false;
  if (s.checkFrequency === 'manual') return false;
  if (!s.lastCheckedAt) return true;
  const elapsed = Date.now() - new Date(s.lastCheckedAt).getTime();
  const H = 3_600_000;
  const need =
    s.checkFrequency === 'hourly'
      ? H
      : s.checkFrequency === 'daily'
        ? 24 * H
        : s.checkFrequency === 'weekly'
          ? 7 * 24 * H
          : Number.POSITIVE_INFINITY;
  return elapsed >= need;
}

/** Alle fälligen Quellen scannen (für Cron/Edge-Function). */
export async function scanDueSources(): Promise<{
  scanned: number;
  results: Array<{ source: string | null; imported?: number; extracted?: number; error?: string }>;
}> {
  // Älteste zuerst (kein Verhungern später angelegter Quellen) + Anzahl-Cap.
  const due = (await listSources())
    .filter(isDue)
    .sort((a, b) => (a.lastCheckedAt ?? '').localeCompare(b.lastCheckedAt ?? ''))
    .slice(0, MAX_SOURCES_PER_RUN);
  const results = [];
  for (const s of due) {
    try {
      const sum = await ingestFromSource(s);
      results.push({ source: s.name, extracted: sum.extracted, imported: sum.imported });
    } catch (e) {
      results.push({ source: s.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { scanned: due.length, results };
}

/**
 * Quellen-Scan: lädt die Quelle (Website/JSON-LD/iCal/RSS), erzeugt Kandidaten
 * und protokolliert den Lauf in event_ingestion_runs. On-demand (Button) ODER
 * später per Cron aufrufbar.
 */
export async function ingestFromSource(source: EventSource): Promise<IngestSummary> {
  const runId = await startRun(source.id);
  const logs: string[] = [];
  const candidateIds: string[] = [];
  let extracted = 0;
  let skippedPast = 0;
  let skippedDuplicate = 0;
  let invalid = 0;

  const place = (r: InsertOutcome): void => {
    if ('id' in r) candidateIds.push(r.id);
    else if (r.skip === 'past') skippedPast++;
    else skippedDuplicate++;
  };

  try {
    if (!source.url) {
      logs.push('Quelle hat keine URL — nur manueller Import möglich, kein Scan.');
    } else {
      const ctx: IngestContext = {
        sourceId: source.id,
        sourceKind: sourceKindFor(source.type),
        sourceName: source.name,
      };
      const outcome = await fetchWebsite(source.url);
      logs.push(...outcome.logs);

      // Strukturierte Treffer (JSON-LD/iCal) direkt einreihen.
      for (const e of outcome.structured) {
        extracted++;
        place(await insertOne(e, ctx, null));
      }
      // Roh-Texte (RSS/HTML) durch die KI-Extraktion schicken.
      for (const t of outcome.texts) {
        const r = await extractEvents({
          text: t.text,
          sourceUrl: t.sourceUrl ?? source.url,
          context: source.name ?? undefined,
        });
        invalid += r.invalidCount;
        for (const e of r.events) {
          extracted++;
          place(await insertOne(e, ctx, t.text));
        }
      }
    }

    await finishRun(runId, {
      status: 'success',
      foundEventsCount: extracted,
      createdEventsCount: candidateIds.length,
      updatedEventsCount: 0,
      logs: logs.join('\n'),
    });
  } catch (e) {
    await finishRun(runId, {
      status: 'failed',
      foundEventsCount: extracted,
      createdEventsCount: candidateIds.length,
      updatedEventsCount: 0,
      logs: logs.join('\n'),
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    throw e;
  } finally {
    // Auch bei Fehler markieren → fehlerhafte Quelle wird nicht jeden Cron-Lauf
    // erneut sofort versucht (Backoff über die Frequenz).
    await markSourceChecked(source.id).catch(() => {});
  }

  return { extracted, imported: candidateIds.length, skippedPast, skippedDuplicate, invalid, candidateIds };
}
