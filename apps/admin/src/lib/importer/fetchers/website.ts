import type { ExtractedEvent } from '@dots/shared';
import { politeFetch } from './http';
import { extractJsonLdEvents } from './jsonld';
import { extractIcalEvents } from './ical';
import { parseFeed, type RawTextItem } from './rss';

/**
 * Website-Fetcher: lädt EINE öffentliche URL (kein Link-Crawling) und sucht in
 * dieser Reihenfolge nach Event-Daten:
 *   1. JSON-LD schema.org/Event  → strukturiert (kein LLM nötig)
 *   2. iCal (.ics)               → strukturiert
 *   3. RSS/Atom                  → Roh-Text → LLM
 *   4. sichtbarer HTML-Text      → Roh-Text → LLM
 * Strukturierte Treffer haben Vorrang; nur wenn keine vorhanden sind, wird Text
 * an die Claude-Extraktion übergeben (vermeidet Doppel-Erfassung).
 */

export interface FetchOutcome {
  structured: ExtractedEvent[];
  texts: RawTextItem[];
  logs: string[];
}

const MAX_TEXT = 8000;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

export async function fetchWebsite(url: string): Promise<FetchOutcome> {
  const logs: string[] = [];
  const res = await politeFetch(url, 'text/html,application/xhtml+xml,text/calendar,application/rss+xml,*/*');
  if (!res.ok) {
    logs.push(`Fetch fehlgeschlagen (${res.status}): ${res.error ?? 'unbekannt'}`);
    return { structured: [], texts: [], logs };
  }

  const body = res.body;
  const ct = res.contentType.toLowerCase();
  const lower = body.slice(0, 200).toLowerCase();

  // 1/2) iCal
  if (url.toLowerCase().endsWith('.ics') || ct.includes('calendar') || body.includes('BEGIN:VCALENDAR')) {
    const structured = extractIcalEvents(body, url);
    logs.push(`iCal erkannt → ${structured.length} VEVENT(s)`);
    return { structured, texts: [], logs };
  }

  // 3) RSS/Atom
  if (ct.includes('rss') || ct.includes('atom') || ct.includes('xml') || lower.includes('<rss') || lower.includes('<feed')) {
    const texts = parseFeed(body);
    logs.push(`Feed erkannt → ${texts.length} Eintrag/Einträge (gehen an die KI-Extraktion)`);
    return { structured: [], texts, logs };
  }

  // 4) HTML: zuerst JSON-LD, sonst sichtbarer Text
  const structured = extractJsonLdEvents(body, url);
  if (structured.length > 0) {
    logs.push(`JSON-LD schema.org/Event → ${structured.length} Event(s)`);
    return { structured, texts: [], logs };
  }
  const text = htmlToText(body);
  if (!text) {
    logs.push('Kein strukturiertes Markup und kein lesbarer Text gefunden');
    return { structured: [], texts: [], logs };
  }
  logs.push('Kein JSON-LD/iCal → sichtbarer Seitentext geht an die KI-Extraktion');
  return { structured: [], texts: [{ text, sourceUrl: url }], logs };
}
