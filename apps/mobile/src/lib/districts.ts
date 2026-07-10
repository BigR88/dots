/**
 * Eigene DOTS-Stadtteil-Labels für Frankfurt — als Overlay über der Karte, damit
 * Design, Sichtbarkeit und Zoom-Verhalten kontrollierbar sind (unabhängig von den
 * Labels der Satellitenkarte). KEINE echten Grenzen/Polygone — nur Namen an
 * ungefähren Zentren mit Zoom-Schwellen + Priorität fürs Declutter.
 *
 * Hierarchie: Event-Marker/-Labels haben Vorrang; Stadtteile geben nur grobe
 * Orientierung und treten zurück (luftige, transparente Versalien statt Pills).
 */

export interface District {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Ab dieser Zoomstufe sichtbar (höhere Stufe = später eingeblendet). */
  minZoom: number;
  /** Optional: ab hier wieder ausblenden. */
  maxZoom?: number;
  /** Höher = wichtiger (gewinnt beim Declutter). */
  priority: number;
  /** Nightlife-Hotspot-Viertel → dezent lila hervorgehobenes Label. */
  nightlife?: boolean;
}

// Die Basemap (CARTO voyager_nolabels) beschriftet NICHTS — die DOTS-Labels sind
// die einzige Beschriftung der Übersicht (keine Doppelungen möglich).
// Tiers über minZoom: große Bereiche früh, Nightlife-Spots beim Reinzoomen.
export const DISTRICTS: District[] = [
  // Tier A — früh sichtbar (große, bekannte Bereiche)
  { id: 'innenstadt', name: 'Innenstadt', lat: 50.1135, lon: 8.681, minZoom: 12.4, priority: 100 },
  { id: 'sachsenhausen', name: 'Sachsenhausen', lat: 50.0985, lon: 8.687, minZoom: 12.4, priority: 96 },
  { id: 'bockenheim', name: 'Bockenheim', lat: 50.124, lon: 8.648, minZoom: 12.4, priority: 92 },
  { id: 'bornheim', name: 'Bornheim', lat: 50.1275, lon: 8.706, minZoom: 12.4, priority: 90 },
  { id: 'bahnhofsviertel', name: 'Bahnhofsviertel', lat: 50.1075, lon: 8.6665, minZoom: 12.6, priority: 88, nightlife: true },

  // Nachbarstadt mit eigener Szene (Robert Johnson) — Übergabe von der
  // Städte-Ebene (CARTO, bis 12.4) an die DOTS-Labels.
  { id: 'offenbach', name: 'Offenbach', lat: 50.101, lon: 8.765, minZoom: 12.4, priority: 72 },

  // Tier B — mittlerer Zoom
  { id: 'nordend', name: 'Nordend', lat: 50.1255, lon: 8.69, minZoom: 13.3, priority: 84 },
  { id: 'westend', name: 'Westend', lat: 50.123, lon: 8.667, minZoom: 13.3, priority: 82 },
  { id: 'ostend', name: 'Ostend', lat: 50.1145, lon: 8.706, minZoom: 13.3, priority: 80 },

  // Tier C — naher Zoom (Nightlife-Spots)
  { id: 'alt-sachsenhausen', name: 'Alt-Sachsenhausen', lat: 50.103, lon: 8.692, minZoom: 13.8, priority: 66, nightlife: true },
  { id: 'berger-strasse', name: 'Berger Straße', lat: 50.1255, lon: 8.711, minZoom: 13.8, priority: 62 },
  { id: 'mainufer', name: 'Mainufer', lat: 50.104, lon: 8.68, minZoom: 13.8, priority: 60 },
];

/** Aktuell sichtbare Stadtteile für eine Zoomstufe, wichtigste zuerst. */
export function visibleDistricts(zoom: number): District[] {
  return DISTRICTS.filter(
    (d) => zoom >= d.minZoom && (d.maxZoom == null || zoom <= d.maxZoom),
  ).sort((a, b) => b.priority - a.priority);
}

/** Stil der Stadtteil-Labels: gesperrte, zurücktretende Versalien im Karten-
 * handwerk-Stil — 600er-Gewicht mit .13em-Sperrung (klassisches Gebiets-Tracking)
 * statt Fett: Gebiete geben Orientierung, POI-Pills tragen. Dreistufiger Halo mit
 * hartem 1px-Kern (Kantenschärfe bei 11px) und weichen Stufen im Basemap-Beige
 * statt Reinweiß — verschmilzt mit dem Grund statt weiße Flecken zu bilden.
 * padding-left kompensiert den Trailing-Space der Sperrung (re-zentriert optisch,
 * wirkt nur zusammen mit der zentrierenden Flex-Box). "case" 1: SF Pro setzt
 * versalien-optimierte Bindestriche ("ALT-SACHSENHAUSEN"); Fallbacks ignorieren es. */
export const DISTRICT_CSS = `
.dots-district-icon{background:transparent!important;border:0!important;}
.dots-district{display:flex;align-items:center;justify-content:center;width:170px;height:20px;
  white-space:nowrap;color:rgba(52,46,90,.72);font-size:11px;font-weight:600;line-height:1;
  letter-spacing:.13em;padding-left:.13em;text-transform:uppercase;
  font-feature-settings:"case" 1;
  text-shadow:0 0 1px rgba(255,255,255,.95),0 0 3px rgba(242,239,233,.9),0 1px 4px rgba(242,239,233,.7);
  transition:opacity .2s ease;pointer-events:none;}
.dots-district.is-night{color:rgba(112,66,220,.9);font-weight:700;
  text-shadow:0 0 1px rgba(255,255,255,.95),0 0 4px rgba(255,255,255,.85),0 1px 5px rgba(242,239,233,.75),0 0 14px rgba(167,139,250,.4);}
.dots-district.is-dim{opacity:.5;}
`;

/** Feste Icon-Box (zentriert auf die Koordinate). */
export const DISTRICT_BOX: [number, number] = [170, 20];

/** HTML des Stadtteil-Labels (dim = dezenter bei hohem Zoom, night = Lila-Schimmer). */
export function districtLabelHtml(name: string, dim: boolean, night = false): string {
  return `<div class="dots-district${night ? ' is-night' : ''}${dim ? ' is-dim' : ''}">${name}</div>`;
}
