import { z } from 'zod';

// Vertrag Worker ⇄ DB (§6.4 / Ingestion-Spec B). Wird in
// imported_event_candidates.extracted (jsonb) abgelegt. Die KI-Extraktion
// validiert ihren Output gegen dieses zod-Schema (= einzige Wahrheit).
//
// Felder sind bewusst `nullable` (string | null): Fehlt eine Information, bleibt
// sie NULL (keine Halluzination) und der Kandidat landet via missing_fields im
// Review. Datums-/Zeitangaben kommen als ISO 8601 mit Offset (Europe/Berlin),
// d. h. „heute/morgen/Samstag" sind bereits gegen das aktuelle Datum aufgelöst.

export const extractedEventSchema = z.object({
  title: z.string().nullable().default(null),
  venue_name: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  short_description: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  music_genre: z.string().nullable().default(null),
  start_datetime: z.string().nullable().default(null), // ISO 8601, z. B. 2026-06-20T23:00:00+02:00
  end_datetime: z.string().nullable().default(null),
  timezone: z.string().default('Europe/Berlin'),
  address: z.string().nullable().default(null),
  city: z.string().default('Frankfurt am Main'),
  price_text: z.string().nullable().default(null),
  min_age: z.string().nullable().default(null),
  ticket_url: z.string().nullable().default(null),
  source_url: z.string().nullable().default(null),
  confidence_score: z.number().default(0),
  missing_fields: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type ExtractedEvent = z.infer<typeof extractedEventSchema>;

// Pflichtfelder, deren Fehlen einen Kandidaten in die Review-Queue zwingt und
// eine automatische Veröffentlichung verhindert (§6.5). Ohne sicheres Datum
// (start_datetime) wird NIE auto-veröffentlicht.
export const REQUIRED_FIELDS: (keyof ExtractedEvent)[] = [
  'title',
  'start_datetime',
  'venue_name',
];

export const AUTO_SUGGEST_THRESHOLD = 0.8;
export const REVIEW_THRESHOLD = 0.5;

// Erlaubte Kategorie-slugs (müssen mit categories.ts/seed.sql übereinstimmen).
export const EXTRACTION_CATEGORY_SLUGS = [
  'day_drinking',
  'clubbing',
  'bars',
  'open_air',
  'student_party',
  'rooftop',
  'live_music',
  'culture',
] as const;

// ── Anthropic Tool-Use-Schema (Worker-Seite) ────────────────────────────────
// JSON-Schema-Spiegel von extractedEventSchema, das die Claude-Extraktion per
// erzwungenem Tool-Use ausfüllt. OHNE minimum/maximum/format/minLength (sonst
// 400); die Bereichsprüfung übernimmt danach extractedEventSchema.safeParse.
// SDK-unabhängig getypt, damit @dots/shared keine Anthropic-SDK-Abhängigkeit hat.

export interface AnthropicToolLike {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const NULLABLE_STRING = { type: ['string', 'null'] };

export const EVENT_ITEM_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { ...NULLABLE_STRING, description: 'Event-Titel, knapp, ohne Emojis. null wenn unklar.' },
    venue_name: { ...NULLABLE_STRING, description: 'Name der Location/des Venues. null wenn nicht genannt.' },
    description: { ...NULLABLE_STRING, description: '1–3 Sätze in EIGENEN Worten — NIEMALS die Caption 1:1 kopieren.' },
    short_description: { ...NULLABLE_STRING, description: 'Sehr kurze Zeile (max ~8 Wörter) für die Karte.' },
    category: {
      ...NULLABLE_STRING,
      description:
        'Genau EIN slug aus: day_drinking, clubbing, bars, open_air, student_party, rooftop, live_music, culture. null wenn unklar.',
    },
    music_genre: { ...NULLABLE_STRING, description: 'Musikrichtung(en), falls genannt.' },
    start_datetime: {
      ...NULLABLE_STRING,
      description:
        'Startzeitpunkt als ISO 8601 mit Offset, Zeitzone Europe/Berlin, z. B. "2026-06-20T23:00:00+02:00". Relative Angaben (heute/morgen/Fr) gegen das heutige Datum auflösen. null wenn unklar — dann NICHT raten.',
    },
    end_datetime: { ...NULLABLE_STRING, description: 'Endzeitpunkt als ISO 8601 oder null.' },
    timezone: { type: 'string', description: "Immer 'Europe/Berlin'." },
    address: { ...NULLABLE_STRING, description: 'Straße + Hausnummer, falls genannt.' },
    city: { type: 'string', description: "Stadt, Standard 'Frankfurt am Main'." },
    price_text: { ...NULLABLE_STRING, description: "Preis als Text, z. B. '15 €', 'ab 10', 'free'. null wenn unbekannt." },
    min_age: { ...NULLABLE_STRING, description: "Altersfreigabe, z. B. '18' oder '16+'. null wenn keine genannt." },
    ticket_url: { ...NULLABLE_STRING, description: 'Ticket-Link (http/https), falls vorhanden.' },
    source_url: { ...NULLABLE_STRING, description: 'Original-Quelle (Post/Seite), falls bekannt.' },
    confidence_score: {
      type: 'number',
      description: 'Sicherheit 0.0–1.0, dass dies ein echtes, korrekt extrahiertes Event ist.',
    },
    missing_fields: {
      type: 'array',
      items: { type: 'string' },
      description: 'Namen der Felder, die im Input fehlten und geraten/leer sind.',
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Kurze Hinweise für die Review (z. B. „Datum nur als Wochentag genannt").',
    },
  },
  required: ['title', 'start_datetime', 'confidence_score', 'missing_fields', 'warnings'],
};

export const EMIT_EVENTS_TOOL: AnthropicToolLike = {
  name: 'emit_events',
  description:
    'Gib die im Input gefundenen Veranstaltungen strukturiert zurück. Erfasse jedes eigenständige Event separat (Wochenprogramm = mehrere). Wenn keine echte zukünftige Veranstaltung erkennbar ist, gib ein leeres events-Array zurück. Erfinde nichts — fehlende Infos = null.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      events: { type: 'array', items: EVENT_ITEM_SCHEMA, description: '0..n extrahierte Events.' },
    },
    required: ['events'],
  },
};
