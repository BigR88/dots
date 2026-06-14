// Kuratierte Kategorien/Vibes + Schnellfilter + Zeit-Tabs (§2.1, §7).
// slug muss mit supabase/seed.sql (categories.slug) übereinstimmen.

export interface CategoryDef {
  slug: string;
  name: string;
  icon: string; // Material/Ionicons-Key
  color: string; // Pin-/Chip-Farbe
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'day_drinking', name: 'Day Drinking', icon: 'sunny', color: '#FF9F0A' },
  { slug: 'clubbing', name: 'Clubbing', icon: 'musical-notes', color: '#7B61FF' },
  { slug: 'bars', name: 'Bars', icon: 'wine', color: '#FF2E93' },
  { slug: 'open_air', name: 'Open Air', icon: 'leaf', color: '#00D6A0' },
  { slug: 'student_party', name: 'Studentenparty', icon: 'school', color: '#2E8BFF' },
  { slug: 'rooftop', name: 'Rooftop', icon: 'business', color: '#FF6A3D' },
  { slug: 'live_music', name: 'Live Music', icon: 'mic', color: '#FF2D55' },
  { slug: 'culture', name: 'Kultur', icon: 'color-palette', color: '#B06CFF' },
];

export const CATEGORY_BY_SLUG: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

// Zusätzliche, nicht-kategoriebasierte Schnellfilter (Chips).
export type QuickFilterId = 'free' | 'under_20' | 'near_me';

export interface QuickFilterDef {
  id: QuickFilterId;
  label: string;
  icon: string;
}

export const QUICK_FILTERS: QuickFilterDef[] = [
  { id: 'free', label: 'Free Entry', icon: 'pricetag' },
  { id: 'under_20', label: '< 20 €', icon: 'cash' },
  { id: 'near_me', label: 'Nähe', icon: 'location' },
];

export type TimeTabId = 'today' | 'tomorrow' | 'weekend' | 'trending';

export interface TimeTabDef {
  id: TimeTabId;
  label: string;
}

export const TIME_TABS: TimeTabDef[] = [
  { id: 'today', label: 'Heute' },
  { id: 'tomorrow', label: 'Morgen' },
  { id: 'weekend', label: 'Wochenende' },
  { id: 'trending', label: 'Trending' },
];

export type SortId = 'date' | 'distance' | 'popularity' | 'price';

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'date', label: 'Datum' },
  { id: 'distance', label: 'Entfernung' },
  { id: 'popularity', label: 'Beliebtheit' },
  { id: 'price', label: 'Preis' },
];
