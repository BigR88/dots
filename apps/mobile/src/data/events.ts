import type { DotsEvent, GeoPoint, SortId, TimeTabId, QuickFilterId } from '@dots/shared';
import { FIXTURE_EVENTS, geoPointFromPostgis } from '@dots/shared';
import { rangeForTab } from '@/lib/time';
import { isFree, isUnder20 } from '@/lib/format';
import { distanceMeters } from '@/lib/geo';
import { fetchSocialStats } from './social';
import { isSupabaseConfigured, supabase } from './supabase';

// Radius für den "Nähe zu mir"-Schnellfilter (§2.1 M7).
const NEAR_ME_RADIUS_M = 3000;

export interface EventQuery {
  tab: TimeTabId;
  categorySlug: string | null;
  quickFilters: QuickFilterId[];
  sort: SortId;
  /** Nutzerstandort (opt-in) — aktiviert "Nähe"-Filter & Distanz-Sortierung. */
  origin?: GeoPoint | null;
  /** Freitextsuche über Titel, Beschreibung, Venue, Kategorie, Genre & Vibes. */
  search?: string;
}

// ── Filter/Sort (geteilt zwischen Supabase- und Fixtures-Pfad) ──────────────
function applyFilters(events: DotsEvent[], q: EventQuery): DotsEvent[] {
  const { from, to } = rangeForTab(q.tab);
  const origin = q.origin ?? null;
  const needle = q.search?.trim().toLowerCase() ?? '';
  let out = events.filter((e) => {
    const t = new Date(e.startAt).getTime();
    if (t < from.getTime() || t >= to.getTime()) return false;
    if (needle) {
      const hay = [
        e.title,
        e.description,
        e.venue?.name,
        e.category?.name,
        e.musicGenre,
        ...e.vibeTags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (q.categorySlug && e.category?.slug !== q.categorySlug) return false;
    if (q.quickFilters.includes('free') && !isFree(e)) return false;
    if (q.quickFilters.includes('under_20') && !isUnder20(e)) return false;
    if (q.quickFilters.includes('near_me')) {
      // Ohne Standort-Opt-in greift der Nähe-Filter nicht (kein Ausschluss).
      if (origin && e.location) {
        if (distanceMeters(origin, e.location) > NEAR_ME_RADIUS_M) return false;
      }
    }
    return true;
  });

  const distOf = (e: DotsEvent): number =>
    origin && e.location ? distanceMeters(origin, e.location) : Number.POSITIVE_INFINITY;

  out = [...out].sort((a, b) => {
    switch (q.sort) {
      case 'popularity':
        return b.popularityScore - a.popularityScore;
      case 'price':
        return (a.priceMin ?? 0) - (b.priceMin ?? 0);
      case 'distance':
        // Ohne Standort: Fallback auf Datum.
        if (!origin) return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        return distOf(a) - distOf(b);
      case 'date':
      default:
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    }
  });

  // Im Trending-Tab immer nach Beliebtheit, sofern nicht explizit anders sortiert.
  if (q.tab === 'trending' && q.sort === 'date') {
    out = [...out].sort((a, b) => b.popularityScore - a.popularityScore);
  }
  return out;
}

// ── Supabase-Mapping ────────────────────────────────────────────────────────
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

const SELECT =
  '*, venue:venues(*), category:categories(*), organizer:organizers(*)';

async function fetchPublished(): Promise<DotsEvent[]> {
  if (!supabase) return FIXTURE_EVENTS;
  const { data, error } = await supabase
    .from('events')
    .select(SELECT)
    .eq('status', 'published');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// ── Öffentliche API ─────────────────────────────────────────────────────────
export async function listEvents(q: EventQuery): Promise<DotsEvent[]> {
  const base = isSupabaseConfigured ? await fetchPublished() : FIXTURE_EVENTS;
  const out = applyFilters(base, q);

  // Trending live: nach echtem Trend-Score (Zusagen×5 + Klicks/7T) ordnen,
  // solange der Nutzer nicht explizit anders sortiert hat.
  if (q.tab === 'trending' && q.sort === 'date' && isSupabaseConfigured) {
    try {
      const { trend } = await fetchSocialStats();
      return [...out].sort(
        (a, b) =>
          (trend[b.id] ?? 0) - (trend[a.id] ?? 0) || b.popularityScore - a.popularityScore,
      );
    } catch {
      return out; // Netzfehler: Reihenfolge aus applyFilters (Beliebtheit)
    }
  }
  return out;
}

/** Events zu einer ID-Liste (Favoriten), chronologisch sortiert. */
export async function listEventsByIds(ids: readonly string[]): Promise<DotsEvent[]> {
  if (ids.length === 0) return [];
  const base = isSupabaseConfigured ? await fetchPublished() : FIXTURE_EVENTS;
  const wanted = new Set(ids);
  return base
    .filter((e) => wanted.has(e.id))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export async function getEventById(id: string): Promise<DotsEvent | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('events')
      .select(SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  }
  return FIXTURE_EVENTS.find((e) => e.id === id) ?? null;
}

export const usingLiveBackend = isSupabaseConfigured;
