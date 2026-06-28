import { extractedEventSchema, type ExtractedEvent } from '@dots/shared';
import { normalizeToBerlinIso } from '../time';

/**
 * Liest schema.org/Event-Daten aus JSON-LD-Blöcken (<script type="application/ld+json">).
 * Strukturierte Events sind die zuverlässigste Quelle → direkte Abbildung auf
 * ExtractedEvent (ohne LLM), mit hoher Konfidenz.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function collectNodes(parsed: any, out: any[]): void {
  if (!parsed) return;
  if (Array.isArray(parsed)) {
    for (const p of parsed) collectNodes(p, out);
    return;
  }
  if (typeof parsed === 'object') {
    if (parsed['@graph']) collectNodes(parsed['@graph'], out);
    out.push(parsed);
  }
}

function isEvent(node: any): boolean {
  const t = node?.['@type'];
  if (!t) return false;
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === 'string' && x.toLowerCase().includes('event'));
}

function str(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
}

function venueName(loc: any): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc.trim() || null;
  if (Array.isArray(loc)) return venueName(loc[0]);
  return str(loc.name);
}

function addressOf(loc: any): string | null {
  const a = Array.isArray(loc) ? loc[0]?.address : loc?.address;
  if (!a) return null;
  if (typeof a === 'string') return a.trim() || null;
  return [str(a.streetAddress), str(a.postalCode), str(a.addressLocality)].filter(Boolean).join(', ') || null;
}

function priceText(offers: any): string | null {
  const o = Array.isArray(offers) ? offers[0] : offers;
  if (!o) return null;
  const p = str(o.price) ?? str(o.lowPrice);
  if (!p) return null;
  const cur = str(o.priceCurrency);
  return cur ? `${p} ${cur}` : p;
}

function ticketUrl(offers: any): string | null {
  const o = Array.isArray(offers) ? offers[0] : offers;
  return o ? str(o.url) : null;
}

function mapNode(node: any, pageUrl: string): ExtractedEvent | null {
  const title = str(node.name);
  const start = normalizeToBerlinIso(str(node.startDate));
  if (!title) return null;

  const warnings: string[] = [];
  if (!start) warnings.push('startDate fehlt/unklar im JSON-LD');

  const raw = {
    title,
    venue_name: venueName(node.location),
    description: str(node.description),
    short_description: null,
    category: null,
    music_genre: null,
    start_datetime: start,
    end_datetime: normalizeToBerlinIso(str(node.endDate)),
    timezone: 'Europe/Berlin',
    address: addressOf(node.location),
    city: 'Frankfurt am Main',
    price_text: priceText(node.offers),
    min_age: null,
    ticket_url: ticketUrl(node.offers),
    source_url: str(node.url) ?? pageUrl,
    confidence_score: start ? 0.85 : 0.45, // strukturiert = zuverlässig, aber ohne Datum unsicher
    missing_fields: start ? [] : ['start_datetime'],
    warnings,
  };
  const parsed = extractedEventSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Extrahiert alle JSON-LD-Events aus HTML. Leeres Array, wenn keine vorhanden. */
export function extractJsonLdEvents(html: string, pageUrl: string): ExtractedEvent[] {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes: unknown[] = [];
  for (const b of blocks) {
    const json = b[1]?.trim();
    if (!json) continue;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collectNodes(JSON.parse(json), nodes as any[]);
    } catch {
      // defektes JSON-LD ignorieren
    }
  }
  const out: ExtractedEvent[] = [];
  for (const n of nodes) {
    if (isEvent(n)) {
      const ev = mapNode(n, pageUrl);
      if (ev) out.push(ev);
    }
  }
  return out;
}
