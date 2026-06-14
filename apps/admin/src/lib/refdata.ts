import { FIXTURE_VENUES, geoPointFromPostgis, type Venue } from '@dots/shared';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Stammdaten fürs Formular. Im Demo-Modus aus den Fixtures, mit Supabase aus
 * der DB (mit echten UUIDs — wichtig, damit `events.venue_id` korrekt verweist).
 */
export async function getVenues(): Promise<Venue[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [...FIXTURE_VENUES].sort((a, b) => a.name.localeCompare(b.name));
  }
  const { data, error } = await supabase.from('venues').select('*').order('name');
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((v: any) => ({
    id: v.id,
    name: v.name,
    address: v.address ?? null,
    city: v.city,
    postalCode: v.postal_code ?? null,
    location: geoPointFromPostgis(v.location),
    description: v.description ?? null,
    websiteUrl: v.website_url ?? null,
    instagram: v.instagram ?? null,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
