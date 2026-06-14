import { z } from 'zod';

// Vertrag Worker ⇄ DB (§6.4). Wird in imported_event_candidates.extracted (jsonb)
// abgelegt. Phase 6 (KI-Import) validiert LLM-Output gegen dieses Schema.

export const extractedEventSchema = z.object({
  title: z.string(),
  date: z.string(), // YYYY-MM-DD
  start_time: z.string(), // HH:MM
  end_time: z.string().default(''),
  location_name: z.string(),
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
