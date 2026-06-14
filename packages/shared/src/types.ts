// Domain-Typen, spiegeln das DB-Schema (§5 Blueprint).

export type EventStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'archived'
  | 'rejected';

export type PriceType = 'free' | 'paid' | 'donation' | 'unknown';

export type SourceType =
  | 'official_api'
  | 'website'
  | 'newsletter'
  | 'instagram_link'
  | 'manual'
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
