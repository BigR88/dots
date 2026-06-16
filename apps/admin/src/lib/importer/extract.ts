import type Anthropic from '@anthropic-ai/sdk';
import {
  EMIT_EVENTS_TOOL,
  extractedEventSchema,
  type ExtractedEvent,
} from '@dots/shared';
import { anthropic, TEXT_MODEL, VISION_MODEL } from './anthropic';
import { berlinToday } from './time';

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface ExtractInput {
  /** Roh-Text (IG-Caption, Newsletter, Website-Text …). */
  text?: string;
  /** Plakat als Base64 (ohne data:-Präfix). */
  imageBase64?: string;
  imageMediaType?: ImageMediaType;
  /** Original-Quelle (Post-/Seiten-URL) — wird ins Schema durchgereicht. */
  sourceUrl?: string;
  /** Kontext-Hinweis (z. B. Venue-/Quellenname), hilft beim Zuordnen. */
  context?: string;
  /** Heutiges Datum YYYY-MM-DD (Default: heute, Europe/Berlin). */
  today?: string;
}

export interface ExtractResult {
  events: ExtractedEvent[];
  /** Anzahl der Tool-Items, die die zod-Validierung NICHT bestanden haben. */
  invalidCount: number;
}

function systemPrompt(today: string): string {
  return [
    'Du bist ein präziser Extraktions-Agent für die Event-App "dots" (Frankfurt am Main, Zielgruppe 18–30, Nightlife/Ausgehen).',
    `Heutiges Datum ist ${today} (Zeitzone Europe/Berlin).`,
    'Aufgabe: Aus dem gegebenen Input ALLE eigenständigen, ZUKÜNFTIGEN Veranstaltungen extrahieren und über das Tool "emit_events" zurückgeben.',
    '',
    'Regeln:',
    '- Nur reale Veranstaltungen mit erkennbarem Datum. Vergangene Events (vor heute) weglassen.',
    '- Ein Wochenprogramm/mehrere Termine ⇒ je Termin ein eigenes Event-Objekt.',
    '- Datum IMMER als YYYY-MM-DD. Deutsche Angaben interpretieren: "Fr 20.6", "Samstag", "20.06.", "diesen Freitag". Fehlt das Jahr, das nächste zukünftige Vorkommen ab heute annehmen.',
    '- Uhrzeiten als HH:MM (24h). "ab 23h" → 23:00. Unbekannt ⇒ Feld leer lassen, NICHT raten.',
    '- category NUR als einer dieser slugs: day_drinking, clubbing, bars, open_air, student_party, rooftop, live_music, culture. Sonst leer.',
    '- description: 1–2 Sätze in EIGENEN Worten zusammenfassen. NIEMALS die Original-Caption 1:1 kopieren.',
    '- Keine Felder erfinden. Was nicht im Input steht, bleibt leer.',
    '- confidence_score ehrlich kalibrieren: 0.9+ nur bei klar genannten Titel+Datum+Ort; ~0.5 bei Unsicherheit; niedrig, wenn vieles geraten ist.',
    '- Ist gar keine zukünftige Veranstaltung erkennbar: events = [] zurückgeben.',
  ].join('\n');
}

/** Ruft Claude (erzwungener Tool-Use) und gibt zod-validierte Events zurück. */
export async function extractEvents(input: ExtractInput): Promise<ExtractResult> {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY fehlt — KI-Extraktion ist nicht möglich.');
  }

  const today = input.today || berlinToday();
  const hasImage = Boolean(input.imageBase64);

  const userBlocks: Anthropic.ContentBlockParam[] = [];
  if (input.context) {
    userBlocks.push({ type: 'text', text: `Quelle/Kontext: ${input.context}` });
  }
  if (input.sourceUrl) {
    userBlocks.push({ type: 'text', text: `Quell-URL: ${input.sourceUrl}` });
  }
  if (hasImage) {
    userBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: input.imageMediaType || 'image/jpeg',
        data: input.imageBase64 as string,
      },
    });
    userBlocks.push({ type: 'text', text: 'Extrahiere die Veranstaltung(en) von diesem Plakat.' });
  }
  if (input.text) {
    userBlocks.push({ type: 'text', text: `Input:\n${input.text}` });
  }
  if (userBlocks.length === 0) {
    throw new Error('Kein Input (Text oder Bild) zum Extrahieren übergeben.');
  }

  const res = await anthropic.messages.create({
    model: hasImage ? VISION_MODEL : TEXT_MODEL,
    max_tokens: 4096,
    system: systemPrompt(today),
    tools: [EMIT_EVENTS_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: 'tool', name: 'emit_events' },
    messages: [{ role: 'user', content: userBlocks }],
  });

  const toolBlock = res.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') return { events: [], invalidCount: 0 };

  const rawEvents = (toolBlock.input as { events?: unknown[] })?.events ?? [];
  const out: ExtractedEvent[] = [];
  let invalidCount = 0;
  for (const item of rawEvents) {
    // Pflichtfelder haben jetzt .default('') → fehlende Felder verwerfen den
    // Kandidaten NICHT mehr (sie landen via missingFields im Review). Hier
    // scheitern nur noch echte Typ-Mismatches (z. B. vibe_tags kein Array).
    const parsed = extractedEventSchema.safeParse(item);
    if (parsed.success) {
      const ev = parsed.data;
      if (!ev.source_url && input.sourceUrl) ev.source_url = input.sourceUrl;
      out.push(ev);
    } else {
      invalidCount++;
      console.warn('[importer] Event verworfen (Schema-Mismatch):', parsed.error.issues[0]?.message);
    }
  }
  return { events: out, invalidCount };
}
