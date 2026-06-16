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
import { ingest, type IngestSummary } from './importer/pipeline';
import type { ImageMediaType } from './importer/extract';
import { promoteCandidate, updateCandidateStatus } from './candidates-store';
import { getSource, removeSource, saveSource } from './sources-store';
import type { SourceType } from '@dots/shared';

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim();
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const ALLOWED_IMAGE_TYPES: ImageMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** sourceId nur durchreichen, wenn die Quelle existiert (sonst FK-Fehler im Live-Insert). */
async function validSourceId(raw: string): Promise<string | null> {
  if (!raw) return null;
  return (await getSource(raw)) ? raw : null;
}

function summaryMsg(s: IngestSummary): string {
  const parts = [`${s.imported} importiert`, `${s.extracted} erkannt`];
  if (s.skippedPast > 0) parts.push(`${s.skippedPast} vergangen übersprungen`);
  if (s.invalid > 0) parts.push(`${s.invalid} ungültig verworfen`);
  return parts.join(' · ');
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

// ── KI-Import-Agent: Import-Aktionen ────────────────────────────────────────

/** Text einfügen → Claude extrahiert → Kandidaten in die Review-Queue. */
export async function pasteImportAction(formData: FormData): Promise<void> {
  const text = str(formData, 'text');
  const context = str(formData, 'context') || undefined;
  const sourceId = await validSourceId(str(formData, 'sourceId'));
  if (!text) redirect(`/candidates?err=${encodeURIComponent('Kein Text eingegeben.')}`);

  let redirectTo = '/candidates';
  try {
    const s = await ingest({ text, context }, sourceId);
    redirectTo += `?msg=${encodeURIComponent(summaryMsg(s))}`;
  } catch (e) {
    redirectTo += `?err=${encodeURIComponent(errMsg(e))}`;
  }
  revalidatePath('/candidates');
  redirect(redirectTo);
}

/** Plakat hochladen → Claude Vision extrahiert → Review-Queue. */
export async function posterImportAction(formData: FormData): Promise<void> {
  const file = formData.get('image');
  const context = str(formData, 'context') || undefined;
  const sourceId = await validSourceId(str(formData, 'sourceId'));

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/candidates?err=${encodeURIComponent('Kein Bild gewählt.')}`);
  }
  const f = file as File;
  const mediaType = (f.type || '') as ImageMediaType;
  if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) {
    redirect(`/candidates?err=${encodeURIComponent('Format nicht unterstützt — JPEG, PNG, WebP oder GIF.')}`);
  }

  let redirectTo = '/candidates';
  try {
    const imageBase64 = Buffer.from(await f.arrayBuffer()).toString('base64');
    const s = await ingest({ imageBase64, imageMediaType: mediaType, context }, sourceId);
    redirectTo += `?msg=${encodeURIComponent(summaryMsg(s))}`;
  } catch (e) {
    redirectTo += `?err=${encodeURIComponent(errMsg(e))}`;
  }
  revalidatePath('/candidates');
  redirect(redirectTo);
}

// ── KI-Import-Agent: Review-Aktionen ────────────────────────────────────────

const OVERRIDE_TEXT_FIELDS = [
  'title',
  'date',
  'start_time',
  'end_time',
  'location_name',
  'address',
  'city',
  'category',
  'price',
  'age_restriction',
  'description',
  'music_genre',
  'ticket_url',
  'source_url',
  'organizer',
] as const;

/** Korrigierte Felder aus dem Review-Formular → Overrides fürs Promote. */
function buildOverrides(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of OVERRIDE_TEXT_FIELDS) o[f] = str(fd, f);
  const venueId = str(fd, 'venueId');
  if (venueId) o.venue_id = venueId;
  o.vibe_tags = str(fd, 'vibeTags')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return o;
}

/** Kandidat freigeben → echtes Event (status pending_review). */
export async function approveCandidateAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (!id) redirect('/candidates');

  let redirectTo = '/candidates';
  try {
    await promoteCandidate(id, buildOverrides(formData));
    redirectTo += `?msg=${encodeURIComponent('Event angelegt (Status: zur Prüfung) — in der Event-Liste sichtbar.')}`;
  } catch (e) {
    redirectTo = `/candidates/${id}?err=${encodeURIComponent(errMsg(e))}`;
  }
  revalidatePath('/candidates');
  revalidatePath('/');
  redirect(redirectTo);
}

export async function rejectCandidateAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (id) {
    await updateCandidateStatus(id, 'rejected', { note: str(formData, 'note') || null });
    revalidatePath('/candidates');
  }
  redirect('/candidates');
}

export async function markDuplicateCandidateAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (id) {
    await updateCandidateStatus(id, 'duplicate');
    revalidatePath('/candidates');
  }
  redirect('/candidates');
}

// ── KI-Import-Agent: Quellen-Verwaltung ─────────────────────────────────────

export async function saveSourceAction(formData: FormData): Promise<void> {
  const name = str(formData, 'name');
  const type = (str(formData, 'type') || 'instagram_link') as SourceType;
  if (!name) redirect('/sources');
  await saveSource({
    id: str(formData, 'id') || undefined,
    type,
    name,
    url: str(formData, 'url') || null,
    isTrusted: str(formData, 'isTrusted') === 'on',
  });
  revalidatePath('/sources');
  redirect('/sources');
}

export async function deleteSourceAction(formData: FormData): Promise<void> {
  const id = str(formData, 'id');
  if (id) {
    await removeSource(id);
    revalidatePath('/sources');
  }
  redirect('/sources');
}
