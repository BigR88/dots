import { z } from 'zod';

// Vertrag Worker ⇄ DB (§6.4). Wird in imported_event_candidates.extracted (jsonb)
// abgelegt. Phase 6 (KI-Import) validiert LLM-Output gegen dieses Schema.

export const extractedEventSchema = z.object({
  // Pflichtfelder mit .default(''): fehlt ein Feld, soll der Kandidat NICHT still
  // verworfen werden, sondern über missingFields (REQUIRED_FIELDS) ins Review.
  title: z.string().default(''),
  date: z.string().default(''), // YYYY-MM-DD
  start_time: z.string().default(''), // HH:MM
  end_time: z.string().default(''),
  location_name: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default('Frankfurt am Main'),
  category: z.string().default(''),
  price: z.string().default(''),
  age_restriction: z.string().default(''),
  description: z.string().default(''),
  music_genre: z.string().default(''),
  vibe_tags: z.array(z.string()).default([]),
  ticket_url: z.string().default(''),
  source_url: z.string().default(''),
  organizer: z.string().default(''),
  confidence_score: z.number().min(0).max(1).default(0),
});

export type ExtractedEvent = z.infer<typeof extractedEventSchema>;

// Pflichtfelder, deren Fehlen einen Kandidaten in die Review-Queue zwingt (§6.5).
export const REQUIRED_FIELDS: (keyof ExtractedEvent)[] = [
  'title',
  'date',
  'location_name',
];

export const AUTO_SUGGEST_THRESHOLD = 0.8;
export const REVIEW_THRESHOLD = 0.5;

// ── Anthropic Tool-Use-Schema (Worker-Seite) ────────────────────────────────
// JSON-Schema-Spiegel von extractedEventSchema, das die Claude-Extraktion per
// erzwungenem Tool-Use ausfüllt. BEWUSST OHNE minimum/maximum/format/minLength
// (würde von der API mit 400 abgelehnt); die Bereichsprüfung übernimmt danach
// `extractedEventSchema.safeParse` (zod = einzige Wahrheit). Diese Konstanten
// sind absichtlich SDK-unabhängig getypt, damit @dots/shared keine Abhängigkeit
// zum Anthropic-SDK braucht.

export interface AnthropicToolLike {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const EVENT_ITEM_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: 'Event-Titel, knapp und ohne Emojis. Pflicht.' },
    date: {
      type: 'string',
      description:
        'Datum im Format YYYY-MM-DD. Pflicht. Jahr aus Kontext bzw. dem heutigen Datum ableiten (nächstes zukünftiges Vorkommen).',
    },
    start_time: { type: 'string', description: 'Startzeit HH:MM (24h). Leer lassen, wenn nicht genannt.' },
    end_time: { type: 'string', description: 'Endzeit HH:MM (24h) oder leer.' },
    location_name: { type: 'string', description: 'Name der Location/des Venues. Pflicht.' },
    address: { type: 'string', description: 'Straße + Hausnummer, falls genannt, sonst leer.' },
    city: { type: 'string', description: "Stadt, Standard 'Frankfurt am Main'." },
    category: {
      type: 'string',
      description:
        'Genau EIN slug aus: day_drinking, clubbing, bars, open_air, student_party, rooftop, live_music, culture. Leer, wenn unklar.',
    },
    price: { type: 'string', description: "Preis als Text, z. B. '12', 'ab 10 €', 'free'. Leer, wenn unbekannt." },
    age_restriction: { type: 'string', description: "z. B. '18' oder '16+'. Leer, wenn keine genannt." },
    description: {
      type: 'string',
      description:
        'Kurze Zusammenfassung in EIGENEN Worten (1–2 Sätze). NICHT die Original-Caption 1:1 kopieren.',
    },
    music_genre: { type: 'string', description: 'Musikrichtung(en), falls genannt.' },
    vibe_tags: { type: 'array', items: { type: 'string' }, description: 'Wenige Stimmungs-Tags, kleingeschrieben.' },
    ticket_url: { type: 'string', description: 'Ticket-Link, falls vorhanden.' },
    source_url: { type: 'string', description: 'Original-Quelle (Post/Seite), falls bekannt.' },
    organizer: { type: 'string', description: 'Veranstalter/Promoter, falls genannt. Personennamen sparsam.' },
    confidence_score: {
      type: 'number',
      description:
        'Deine Sicherheit von 0.0 bis 1.0, dass dies eine echte, korrekt extrahierte Veranstaltung ist.',
    },
  },
  required: ['title', 'date', 'location_name', 'confidence_score'],
};

export const EMIT_EVENTS_TOOL: AnthropicToolLike = {
  name: 'emit_events',
  description:
    'Gib die im Input gefundenen Veranstaltungen strukturiert zurück. Erfasse jedes eigenständige Event separat (z. B. Wochenprogramm = mehrere). Wenn keine echte zukünftige Veranstaltung erkennbar ist, gib ein leeres events-Array zurück. Erfinde nichts.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      events: {
        type: 'array',
        items: EVENT_ITEM_SCHEMA,
        description: '0..n extrahierte Events.',
      },
    },
    required: ['events'],
  },
};
