import { palette } from '@dots/shared';

/**
 * Host-agnostische Bausteine für die DOTS-Event-Marker und ihre Zoom-Labels.
 * Wird vom Web-MapProvider direkt genutzt; der native WebView-Provider rendert
 * exakt dasselbe, indem er das hier erzeugte HTML per JSON in die WebView reicht.
 * So gibt es EINE Quelle für Marker-Aussehen + Progressive Disclosure.
 */

const ACCENT = palette.accent; // Marken-Lila — nur für aktive/ausgewählte Marker.

/** Zoomstufen, ab denen mehr Information am Marker erscheint. */
export const MARKER_ZOOM = {
  /** Ab hier: kurzes Label (nur Location-Name). Darunter: nur farbige Dots. */
  label: 14.5,
  /** Ab hier: zusätzliche Kurzinfo (Genre · Uhrzeit bzw. „N Events"). */
  detail: 15.5,
} as const;

/** Felder, die ein Marker zum Rendern braucht (strukturell = VenueMarker). */
export interface MarkerInput {
  color: string;
  /** Anzahl Events am Standort (Zahl im Dot bei > 1). */
  count: number;
  /** Beliebtheit 0..1 — steuert die Dot-Größe. */
  intensity: number;
  venueName: string;
  categoryName: string;
  genre: string | null;
  timeLabel: string | null;
}

/** Transparenter Tap-Halo rund um den Dot (bessere Tappbarkeit ohne mehr Optik). */
export const MARKER_HIT_PAD = 7;

/** Dot-Durchmesser in px: Einzel-Event klein, mehrere/­beliebte etwas größer. */
export function markerSize(intensity: number, count: number, selected: boolean): number {
  const base =
    count > 1 ? 22 + Math.min(count, 6) * 3 + Math.round(intensity * 4) : 14 + Math.round(intensity * 7);
  return selected ? base + 4 : base;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * CSS für alle Marker (Dot, Auswahl-Ring/Pulse, Label, Nutzerstandort). Wird in
 * beide Hosts identisch eingespielt — Web per <style>, nativ im HTML-<head>.
 */
export const MARKER_CSS = `
/* Satellit beruhigen: leicht abdunkeln + entsättigen, damit die Marker tragen. */
.leaflet-tile-pane{filter:saturate(.78) brightness(.72) contrast(1.06);}
/* Dezente Nightlife-Vignette (Eck-/Randabdunklung). Mitte bleibt transparent,
   damit die Marker NICHT abgedunkelt werden — die eigentliche Abdunklung/
   Entsättigung der Karte macht der Tile-Filter darunter. */
/* z-index 450: ÜBER dem Leaflet-Map-Pane (400), sonst läge die Vignette hinter
   den opaken Kacheln und wäre unsichtbar. Da Mitte transparent → Marker tragen. */
.dots-map-tint{position:absolute;inset:0;z-index:450;pointer-events:none;
  background:radial-gradient(116% 82% at 50% 42%, rgba(8,9,18,0) 56%, rgba(7,8,16,.34) 100%),
    linear-gradient(180deg, rgba(7,8,16,0) 78%, rgba(7,8,16,.24) 100%);}
.dots-marker-icon{background:transparent!important;border:0!important;}
.dots-marker{position:relative;display:flex;align-items:center;justify-content:center;}
.dots-dot{position:relative;border-radius:50%;display:flex;align-items:center;justify-content:center;
  border:1.5px solid rgba(255,255,255,.9);box-sizing:border-box;color:#fff;line-height:1;
  transition:transform .15s ease;}
.dots-dot__n{font-weight:800;color:#fff;}
.dots-dot.is-sel{border-color:#fff;z-index:1000;}
.dots-ring{position:absolute;inset:-8px;border-radius:50%;border:3px solid ${ACCENT};
  pointer-events:none;animation:dots-ping 1.7s cubic-bezier(0,0,.2,1) infinite;}
@keyframes dots-ping{0%{transform:scale(.7);opacity:.8}80%{opacity:0}100%{transform:scale(2.05);opacity:0}}
/* Deckkraft trägt die Lesbarkeit (Blur nur Premium-Plus, nicht überall verfügbar). */
.dots-label{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);
  max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background:rgba(13,12,22,.82);color:#fff;font-size:11px;font-weight:700;letter-spacing:-.1px;
  padding:4px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.16);
  text-shadow:0 1px 2px rgba(0,0,0,.55);
  box-shadow:0 6px 18px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.08);
  backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);
  text-align:center;pointer-events:none;}
.dots-label__sub{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:600;opacity:.8;margin-top:1px;letter-spacing:0;}
.dots-user{width:22px;height:22px;}
.dots-user::before{content:'';position:absolute;inset:0;border-radius:50%;background:rgba(108,92,255,.35);animation:dots-pulse 1.8s ease-out infinite;}
.dots-user::after{content:'';position:absolute;top:50%;left:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:${ACCENT};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);}
@keyframes dots-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
.leaflet-container{background:#0b1622;}
`;

export interface MarkerIcon {
  html: string;
  /** Kantenlänge der quadratischen Icon-Box (Dot + Tap-Halo) — Leaflet iconSize/anchor. */
  size: number;
}

/**
 * Baut das Marker-HTML inkl. Auswahl-Zustand und (per Flag) Label.
 * Die Label-Sichtbarkeit entscheidet der Host (Zoom + ggf. Declutter), damit
 * der Web-Provider überlappende Labels unterdrücken kann.
 * - showLabel=false: nur farbiger Dot
 * - showLabel:       Dot + Location-Name
 * - showDetail:      zusätzlich „Genre · Uhrzeit" bzw. „N Events"
 */
export function buildMarkerIcon(
  m: MarkerInput,
  { selected, showLabel, showDetail }: { selected: boolean; showLabel: boolean; showDetail: boolean },
): MarkerIcon {
  const dot = markerSize(m.intensity, m.count, selected);
  const box = dot + MARKER_HIT_PAD * 2; // transparenter Tap-Halo rundherum
  const numFont = Math.max(10, Math.round(dot * 0.46));
  const multi = m.count > 1;

  // Auf der dunkleren Karte: ausgewählter Marker mit kräftigem Lila-Ring + Glow.
  const glow = selected
    ? `0 0 0 3px rgba(108,92,255,.95),0 0 14px ${ACCENT},0 0 22px ${m.color}99,0 2px 8px rgba(0,0,0,.5)`
    : `0 0 8px ${m.color}cc,0 1px 4px rgba(0,0,0,.45)`;

  const num = multi ? `<span class="dots-dot__n" style="font-size:${numFont}px">${m.count}</span>` : '';
  const ring = selected ? '<span class="dots-ring"></span>' : '';

  let label = '';
  if (showLabel) {
    let sub = '';
    if (showDetail) {
      sub = multi ? `${m.count} Events` : [m.genre, m.timeLabel].filter(Boolean).join(' · ');
    }
    label =
      `<div class="dots-label">${esc(m.venueName)}` +
      (sub ? `<span class="dots-label__sub">${esc(sub)}</span>` : '') +
      `</div>`;
  }

  const html =
    `<div class="dots-marker" style="width:${box}px;height:${box}px;">` +
    `<div class="dots-dot${selected ? ' is-sel' : ''}" ` +
    `style="width:${dot}px;height:${dot}px;background:${m.color};box-shadow:${glow};">` +
    `${num}${ring}${label}</div>` +
    `</div>`;

  return { html, size: box };
}
