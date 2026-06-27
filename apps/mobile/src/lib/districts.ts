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
}

// Ungefähre Stadtteil-Zentren (lon/lat). Tiers über minZoom: große Bereiche früh,
// kleinere/nightlife-spezifische Bereiche erst beim Reinzoomen.
export const DISTRICTS: District[] = [
  // Tier A — früh sichtbar (große, bekannte Bereiche)
  { id: 'innenstadt', name: 'Innenstadt', lat: 50.1135, lon: 8.681, minZoom: 12.4, priority: 100 },
  { id: 'sachsenhausen', name: 'Sachsenhausen', lat: 50.0985, lon: 8.687, minZoom: 12.4, priority: 96 },
  { id: 'bockenheim', name: 'Bockenheim', lat: 50.124, lon: 8.648, minZoom: 12.4, priority: 92 },
  { id: 'bornheim', name: 'Bornheim', lat: 50.1275, lon: 8.706, minZoom: 12.4, priority: 90 },

  // Tier B — mittlerer Zoom
  { id: 'bahnhofsviertel', name: 'Bahnhofsviertel', lat: 50.1075, lon: 8.6665, minZoom: 13.3, priority: 88 },
  { id: 'nordend', name: 'Nordend', lat: 50.1255, lon: 8.69, minZoom: 13.3, priority: 84 },
  { id: 'westend', name: 'Westend', lat: 50.123, lon: 8.667, minZoom: 13.3, priority: 82 },
  { id: 'ostend', name: 'Ostend', lat: 50.1145, lon: 8.706, minZoom: 13.3, priority: 80 },
  { id: 'gallus', name: 'Gallus', lat: 50.1045, lon: 8.64, minZoom: 13.3, priority: 74 },

  // Tier C — naher Zoom (kleinere / spezifische Bereiche)
  { id: 'alt-sachsenhausen', name: 'Alt-Sachsenhausen', lat: 50.103, lon: 8.692, minZoom: 14.2, priority: 66 },
  { id: 'mainufer', name: 'Mainufer', lat: 50.104, lon: 8.68, minZoom: 14.2, priority: 60 },
  { id: 'berger-strasse', name: 'Berger Straße', lat: 50.1255, lon: 8.711, minZoom: 14.2, priority: 62 },
  { id: 'europaviertel', name: 'Europaviertel', lat: 50.111, lon: 8.642, minZoom: 14.2, priority: 58 },
  { id: 'westhafen', name: 'Westhafen', lat: 50.1025, lon: 8.654, minZoom: 14.2, priority: 54 },
];

/** Aktuell sichtbare Stadtteile für eine Zoomstufe, wichtigste zuerst. */
export function visibleDistricts(zoom: number): District[] {
  return DISTRICTS.filter(
    (d) => zoom >= d.minZoom && (d.maxZoom == null || zoom <= d.maxZoom),
  ).sort((a, b) => b.priority - a.priority);
}

/** Stil der Stadtteil-Labels: helle, transparente Versalien mit weichem Schatten. */
export const DISTRICT_CSS = `
.dots-district-icon{background:transparent!important;border:0!important;}
.dots-district{display:flex;align-items:center;justify-content:center;width:170px;height:20px;
  white-space:nowrap;color:rgba(255,255,255,.82);font-size:12px;font-weight:700;letter-spacing:.6px;
  text-transform:uppercase;
  text-shadow:0 1px 8px rgba(0,0,0,.75),0 0 3px rgba(0,0,0,.55);
  transition:opacity .2s ease;pointer-events:none;}
.dots-district.is-dim{opacity:.5;}
`;

/** Feste Icon-Box (zentriert auf die Koordinate). */
export const DISTRICT_BOX: [number, number] = [170, 20];

/** HTML des Stadtteil-Labels (dim = dezenter bei hohem Zoom). */
export function districtLabelHtml(name: string, dim: boolean): string {
  return `<div class="dots-district${dim ? ' is-dim' : ''}">${name}</div>`;
}
