import { REQUIRED_FIELDS, type ExtractedEvent } from '@dots/shared';
import { extractEvents, type ExtractInput } from './extract';
import { berlinToday, berlinWallToUtcIso } from './time';
import { findDuplicate, insertCandidate } from '../candidates-store';

/**
 * Ingest-Pipeline: Rohinput → Claude-Extraktion → Zukunfts-Filter →
 * Pflichtfeld-/Duplikatprüfung → Insert in die Review-Queue (pending).
 * Promotet NICHTS automatisch — das macht der Mensch im Review.
 */

export interface IngestSummary {
  extracted: number;
  imported: number;
  skippedPast: number;
  invalid: number;
}

function missingFields(e: ExtractedEvent): string[] {
  return REQUIRED_FIELDS.filter(
    (f) => !String((e as Record<string, unknown>)[f] ?? '').trim(),
  );
}

/** Vergangen, wenn das Event-Datum vor gestern (Berlin) liegt. Reiner
 *  Datums-String-Vergleich → serverzeitzonen-unabhängig. */
function isPast(e: ExtractedEvent): boolean {
  if (!e.date) return false; // ohne Datum → Mensch entscheidet, nicht wegwerfen
  const today = berlinToday();
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  const cutoff = y.toISOString().slice(0, 10); // gestern (YYYY-MM-DD)
  return e.date < cutoff;
}

export async function ingest(
  input: ExtractInput,
  sourceId: string | null = null,
): Promise<IngestSummary> {
  const { events, invalidCount } = await extractEvents(input);
  let imported = 0;
  let skippedPast = 0;

  for (const e of events) {
    if (isPast(e)) {
      skippedPast++;
      continue;
    }
    const iso = berlinWallToUtcIso(e.date, e.start_time);
    const dup = iso ? await findDuplicate(e.title, iso) : null;
    await insertCandidate({
      sourceId,
      rawInput: input.text ?? null, // Plakat-Bytes werden bewusst NICHT gespeichert
      rawImagePath: null,
      extracted: e,
      confidenceScore: e.confidence_score ?? 0,
      possibleDuplicateOf: dup,
      missingFields: missingFields(e),
    });
    imported++;
  }

  return { extracted: events.length, imported, skippedPast, invalid: invalidCount };
}
