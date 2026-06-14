import { promises as fs } from 'fs';
import path from 'path';
import { FIXTURE_EVENTS, geoPointFromPostgis, type DotsEvent } from '@dots/shared';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Event-Datenzugriff fürs Admin. Zwei austauschbare Backends hinter einer API:
 *  - Demo: JSON-Datei `.data/events.json` (seeded aus Fixtures).
 *  - Supabase: echte DB (sobald SUPABASE_URL + SERVICE_ROLE_KEY gesetzt sind).
 * Seiten/Server-Actions rufen nur list/get/save/remove auf und merken nichts
 * vom Wechsel.
 */

export const usingLiveBackend = isSupabaseConfigured;

const SELECT = '*, venue:venues(*), category:categories(*), organizer:organizers(*)';

// ── Supabase-Zeile → DotsEvent ──────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(row: any): DotsEvent {
  const venueLocation = geoPointFromPostgis(row.venue?.location);
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at ?? null,
    doorsAt: row.doors_at ?? null,
    venueId: row.venue_id ?? null,
    venue: row.venue
      ? {
          id: row.venue.id,
          name: row.venue.name,
          address: row.venue.address ?? null,
          city: row.venue.city,
          postalCode: row.venue.postal_code ?? null,
          location: venueLocation,
          description: row.venue.description ?? null,
          websiteUrl: row.venue.website_url ?? null,
          instagram: row.venue.instagram ?? null,
        }
      : null,
    location: geoPointFromPostgis(row.location) ?? venueLocation,
    addressOverride: row.address_override ?? null,
    categoryId: row.category_id ?? null,
    category: row.category
      ? {
          id: row.category.id,
          slug: row.category.slug,
          name: row.category.name,
          icon: row.category.icon ?? null,
          color: row.category.color ?? null,
          sortOrder: row.category.sort_order ?? 0,
          isActive: row.category.is_active ?? true,
        }
      : null,
    musicGenre: row.music_genre ?? null,
    vibeTags: row.vibe_tags ?? [],
    priceType: row.price_type,
    priceMin: row.price_min != null ? Number(row.price_min) : null,
    priceMax: row.price_max != null ? Number(row.price_max) : null,
    currency: row.currency ?? 'EUR',
    ageRestriction: row.age_restriction ?? null,
    coverImageUrl: row.cover_image_path ?? null,
    ticketUrl: row.ticket_url ?? null,
    externalUrl: row.external_url ?? null,
    organizerId: row.organizer_id ?? null,
    organizer: row.organizer
      ? {
          id: row.organizer.id,
          name: row.organizer.name,
          instagram: row.organizer.instagram ?? null,
          websiteUrl: row.organizer.website_url ?? null,
          isVerified: row.organizer.is_verified ?? false,
        }
      : null,
    sourceUrl: row.source_url ?? null,
    popularityScore: Number(row.popularity_score ?? 0),
    favoritesCount: row.favorites_count ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── DotsEvent → Supabase-Zeile (nur beschreibbare Spalten) ──────────────────
async function rowFor(event: DotsEvent): Promise<Record<string, unknown>> {
  // Kategorie kommt als Slug aus dem Formular → echte UUID auflösen.
  let categoryId: string | null = null;
  if (event.category?.slug && supabase) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', event.category.slug)
      .maybeSingle();
    categoryId = data?.id ?? null;
  }
  // location bewusst weglassen: DB-Trigger sync_event_location übernimmt sie
  // aus der Venue. popularity/favorites nicht überschreiben (Defaults/Bestand).
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    status: event.status,
    start_at: event.startAt,
    end_at: event.endAt,
    doors_at: event.doorsAt,
    venue_id: event.venueId,
    category_id: categoryId,
    music_genre: event.musicGenre,
    vibe_tags: event.vibeTags,
    price_type: event.priceType,
    price_min: event.priceMin,
    price_max: event.priceMax,
    currency: event.currency,
    age_restriction: event.ageRestriction,
    ticket_url: event.ticketUrl,
    external_url: event.externalUrl,
    source_url: event.sourceUrl,
  };
}

// ── JSON-Demo-Backend ───────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'events.json');

async function readAll(): Promise<DotsEvent[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as DotsEvent[];
  } catch {
    await writeAll(FIXTURE_EVENTS);
    return [...FIXTURE_EVENTS];
  }
}

async function writeAll(events: DotsEvent[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(events, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

// ── Öffentliche API ─────────────────────────────────────────────────────────
export async function listAllEvents(): Promise<DotsEvent[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('events').select(SELECT).order('start_at');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  const events = await readAll();
  return events.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

export async function getEvent(id: string): Promise<DotsEvent | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('events').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  }
  const events = await readAll();
  return events.find((e) => e.id === id) ?? null;
}

/** Upsert: ersetzt das Event mit gleicher id oder hängt es neu an. */
export async function saveEvent(event: DotsEvent): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('events').upsert(await rowFor(event));
    if (error) throw error;
    return;
  }
  const events = await readAll();
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  await writeAll(events);
}

export async function removeEvent(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const events = await readAll();
  await writeAll(events.filter((e) => e.id !== id));
}

/** Setzt den Demo-Datenbestand auf die Fixtures zurück (nur Demo-Modus). */
export async function resetDemoData(): Promise<void> {
  if (isSupabaseConfigured) return;
  await writeAll(FIXTURE_EVENTS);
}
