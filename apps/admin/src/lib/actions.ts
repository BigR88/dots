'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  CATEGORY_BY_SLUG,
  type Category,
  type DotsEvent,
  type EventStatus,
  type PriceType,
} from '@dots/shared';
import { getVenues } from './refdata';
import { getEvent, removeEvent, resetDemoData, saveEvent } from './store';

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim();
}

function num(fd: FormData, key: string): number | null {
  const v = str(fd, key).replace(',', '.');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** datetime-local ("2026-06-13T23:00") → ISO-String; leere Eingabe → null. */
function iso(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function categoryFor(slug: string): Category | null {
  const d = CATEGORY_BY_SLUG[slug];
  if (!d) return null;
  return {
    id: slug,
    slug,
    name: d.name,
    icon: d.icon,
    color: d.color,
    sortOrder: 0,
    isActive: true,
  };
}

export async function upsertEventAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id') || crypto.randomUUID();
  const existing = await getEvent(id);

  const venues = await getVenues();
  const venue = venues.find((v) => v.id === str(formData, 'venueId')) ?? null;
  const categorySlug = str(formData, 'categorySlug');
  const category = categoryFor(categorySlug);
  const startAt = iso(formData, 'startAt');
  if (!startAt || !str(formData, 'title')) {
    // Pflichtfelder fehlen — im Demo-Admin schlicht zurück zur Liste.
    redirect('/');
  }

  const event: DotsEvent = {
    id,
    title: str(formData, 'title'),
    description: str(formData, 'description') || null,
    status: (str(formData, 'status') || 'draft') as EventStatus,
    startAt,
    endAt: iso(formData, 'endAt'),
    doorsAt: existing?.doorsAt ?? null,
    venueId: venue?.id ?? null,
    venue,
    location: venue?.location ?? null,
    addressOverride: existing?.addressOverride ?? null,
    categoryId: category?.id ?? null,
    category,
    musicGenre: str(formData, 'musicGenre') || null,
    vibeTags: str(formData, 'vibeTags')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    priceType: (str(formData, 'priceType') || 'unknown') as PriceType,
    priceMin: num(formData, 'priceMin'),
    priceMax: num(formData, 'priceMax'),
    currency: 'EUR',
    ageRestriction: num(formData, 'ageRestriction'),
    coverImageUrl: existing?.coverImageUrl ?? null,
    ticketUrl: str(formData, 'ticketUrl') || null,
    externalUrl: str(formData, 'externalUrl') || null,
    organizerId: existing?.organizerId ?? null,
    organizer: existing?.organizer ?? null,
    sourceUrl: existing?.sourceUrl ?? null,
    popularityScore: existing?.popularityScore ?? 0,
    favoritesCount: existing?.favoritesCount ?? 0,
  };

  await saveEvent(event);
  revalidatePath('/');
  redirect('/');
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  const status = str(formData, 'status') as EventStatus;
  const event = await getEvent(id);
  if (event) {
    await saveEvent({ ...event, status });
    revalidatePath('/');
  }
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (id) {
    await removeEvent(id);
    revalidatePath('/');
  }
}

export async function resetDemoAction(): Promise<void> {
  await resetDemoData();
  revalidatePath('/');
}
