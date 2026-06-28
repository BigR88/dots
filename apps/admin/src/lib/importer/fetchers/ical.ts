import { extractedEventSchema, type ExtractedEvent } from '@dots/shared';
import { normalizeToBerlinIso, zonedWallToUtcIso } from '../time';

/**
 * Sehr kompakter iCal/ICS-Parser (VEVENT → ExtractedEvent). Deckt die in
 * Venue-Kalendern üblichen Felder ab; keine externe Dependency.
 */

/** "20260620T230000Z" / "20260620T230000" / "20260620" → UTC-ISO. Berücksichtigt TZID. */
function icalDateToIso(raw: string, tzid?: string): string | null {
  const v = raw.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return normalizeToBerlinIso(v);
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (!hh) return normalizeToBerlinIso(`${y}-${mo}-${d}`); // reines Datum → Berlin-Mitternacht
  if (z) return normalizeToBerlinIso(`${y}-${mo}-${d}T${hh}:${mm}:${ss ?? '00'}Z`); // UTC
  // Naive Wandzeit: TZID nutzen, falls vorhanden und nicht Berlin; sonst Berlin annehmen.
  if (tzid && tzid.toLowerCase() !== 'europe/berlin') {
    const iso = zonedWallToUtcIso(`${y}-${mo}-${d}`, `${hh}:${mm}:${ss ?? '00'}`, tzid);
    if (iso) return iso;
  }
  return normalizeToBerlinIso(`${y}-${mo}-${d}T${hh}:${mm}:${ss ?? '00'}`);
}

function unfold(ics: string): string[] {
  // RFC 5545: Fortsetzungszeilen beginnen mit Space/Tab → an Vorzeile anhängen.
  const raw = ics.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if (/^[ \t]/.test(line) && out.length) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

export function extractIcalEvents(ics: string, pageUrl: string): ExtractedEvent[] {
  const lines = unfold(ics);
  const events: ExtractedEvent[] = [];
  let cur: Record<string, string> | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      cur = {};
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      if (cur) {
        const start = cur.DTSTART ? icalDateToIso(cur.DTSTART, cur.DTSTART_TZID) : null;
        const title = cur.SUMMARY ? unescape(cur.SUMMARY) : null;
        if (title) {
          const raw = {
            title,
            venue_name: cur.LOCATION ? unescape(cur.LOCATION) : null,
            description: cur.DESCRIPTION ? unescape(cur.DESCRIPTION) : null,
            short_description: null,
            category: null,
            music_genre: null,
            start_datetime: start,
            end_datetime: cur.DTEND ? icalDateToIso(cur.DTEND, cur.DTEND_TZID) : null,
            timezone: 'Europe/Berlin',
            address: null,
            city: 'Frankfurt am Main',
            price_text: null,
            min_age: null,
            ticket_url: null,
            source_url: cur.URL ? unescape(cur.URL) : pageUrl,
            confidence_score: start ? 0.8 : 0.45,
            missing_fields: start ? [] : ['start_datetime'],
            warnings: start ? [] : ['DTSTART fehlt/unklar im iCal'],
          };
          const parsed = extractedEventSchema.safeParse(raw);
          if (parsed.success) events.push(parsed.data);
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const keyPart = line.slice(0, idx); // z. B. "DTSTART;TZID=Europe/Berlin"
    const value = line.slice(idx + 1);
    const key = keyPart.split(';')[0].toUpperCase();
    if (['SUMMARY', 'DTSTART', 'DTEND', 'LOCATION', 'DESCRIPTION', 'URL'].includes(key)) {
      cur[key] = value;
      if (key === 'DTSTART' || key === 'DTEND') {
        const tzid = keyPart.match(/TZID=([^;]+)/i)?.[1];
        if (tzid) cur[`${key}_TZID`] = tzid;
      }
    }
  }
  return events;
}
