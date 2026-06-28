// Domain-Typen, spiegeln das DB-Schema (§5 Blueprint).

import type { ExtractedEvent } from './extraction';

export type EventStatus =
  | 'draft'
  | 'needs_review'
  | 'pending_review'
  | 'published'
  | 'archived'
  | 'expired'
  | 'rejected';

export type PriceType = 'free' | 'paid' | 'donation' | 'unknown';

export type SourceType =
  | 'official_api'
  | 'api'
  | 'website'
  | 'rss'
  | 'ical'
  | 'newsletter'
  | 'instagram_link'
  | 'instagram_manual'
  | 'manual'
  | 'organizer'
  | 'partner_submission';

export type UserRole = 'user' | 'editor' | 'admin';

export interface GeoPoint {
  lon: number;
  lat: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string;
  postalCode: string | null;
  location: GeoPoint | null;
  description: string | null;
  websiteUrl: string | null;
  instagram: string | null;
}

export interface Organizer {
  id: string;
  name: string;
  instagram: string | null;
  websiteUrl: string | null;
  isVerified: boolean;
}

export interface DotsEvent {
  id: string;
  title: string;
  description: string | null;
  status: EventStatus;

  startAt: string; // ISO 8601
  endAt: string | null;
  doorsAt: string | null;

  venueId: string | null;
  venue: Venue | null;
  location: GeoPoint | null;
  addressOverride: string | null;

  categoryId: string | null;
  category: Category | null;
  musicGenre: string | null;
  vibeTags: string[];

  priceType: PriceType;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  ageRestriction: number | null;

  coverImageUrl: string | null;
  ticketUrl: string | null;
  externalUrl: string | null;

  organizerId: string | null;
  organizer: Organizer | null;
  sourceUrl: string | null;

  popularityScore: number;
  favoritesCount: number;
}

// ── KI-Import-Agent (§6) ─────────────────────────────────────────────────────

export type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'duplicate';

/** Wie oft eine Quelle automatisch geprüft wird. */
export type CheckFrequency = 'manual' | 'hourly' | 'daily' | 'weekly';

/** Provenienz eines Events/Kandidaten (Ingestion-Spec). */
export type SourceKind =
  | 'website'
  | 'api'
  | 'instagram_upload'
  | 'manual'
  | 'email'
  | 'organizer_portal';

/** Eine vom Nutzer gepflegte Quelle, aus der der Agent Events zieht. */
export interface EventSource {
  id: string;
  type: SourceType;
  name: string | null;
  url: string | null;
  organizerId: string | null;
  isTrusted: boolean;
  active: boolean;
  checkFrequency: CheckFrequency;
  lastCheckedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/** Ein extrahiertes Event in der Review-Queue, bevor es zum Event promoted wird. */
export interface ImportedEventCandidate {
  id: string;
  sourceId: string | null;
  status: CandidateStatus;
  rawInput: string | null;
  rawImagePath: string | null;
  extracted: ExtractedEvent;
  confidenceScore: number;
  possibleDuplicateOf: string | null;
  missingFields: string[];
  warnings: string[];
  sourceKind: SourceKind | null;
  sourceName: string | null;
  reviewNote: string | null;
  promotedEventId: string | null;
  createdAt: string;
}

/** Protokoll eines Ingestion-Laufs (eine Quelle, ein Durchlauf). */
export interface EventIngestionRun {
  id: string;
  sourceId: string | null;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  logs: string | null;
  foundEventsCount: number;
  createdEventsCount: number;
  updatedEventsCount: number;
  errorMessage: string | null;
}

/** Ein hochgeladener Flyer/Screenshot + dessen OCR-/Extraktionsergebnis. */
export interface EventUpload {
  id: string;
  fileUrl: string | null;
  fileType: string | null;
  sourceKind: SourceKind;
  rawOcrText: string | null;
  extractedJson: unknown | null;
  status: 'pending' | 'extracted' | 'linked' | 'failed';
  candidateId: string | null;
  createdAt: string;
}
