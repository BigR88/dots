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
  /** Ab hier: Label mit Location-Name. Darunter: nur farbige Dots. */
  label: 13.5,
  /** Ab hier: zusätzliche Kurzinfo (Genre · Uhrzeit bzw. „N Events"). */
  detail: 15,
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

/** Dot-Durchmesser in px: Einzel-Event klein, mehrere/­beliebte etwas größer. */
export function markerSize(intensity: number, count: number, selected: boolean): number {
  const base =
    count > 1 ? 24 + Math.min(count, 6) * 3 + Math.round(intensity * 4) : 16 + Math.round(intensity * 8);
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
.dots-marker-icon{background:transparent!important;border:0!important;}
.dots-dot{position:relative;border-radius:50%;display:flex;align-items:center;justify-content:center;
  border:2px solid rgba(255,255,255,.92);box-sizing:border-box;color:#fff;line-height:1;
  transition:transform .15s ease;}
.dots-dot__n{font-weight:800;color:#fff;}
.dots-dot.is-sel{border-color:#fff;z-index:1000;}
.dots-ring{position:absolute;inset:-7px;border-radius:50%;border:2.5px solid ${ACCENT};
  pointer-events:none;animation:dots-ping 1.6s cubic-bezier(0,0,.2,1) infinite;}
@keyframes dots-ping{0%{transform:scale(.75);opacity:.7}80%{opacity:0}100%{transform:scale(1.95);opacity:0}}
.dots-label{position:absolute;top:calc(100% + 7px);left:50%;transform:translateX(-50%);
  max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background:rgba(12,13,18,.82);color:#fff;font-size:11px;font-weight:700;
  letter-spacing:-.2px;padding:3px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  box-shadow:0 4px 14px rgba(0,0,0,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  text-align:center;pointer-events:none;}
.dots-label__sub{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:600;opacity:.82;margin-top:1px;}
.dots-user{width:22px;height:22px;}
.dots-user::before{content:'';position:absolute;inset:0;border-radius:50%;background:rgba(108,92,255,.35);animation:dots-pulse 1.8s ease-out infinite;}
.dots-user::after{content:'';position:absolute;top:50%;left:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:${ACCENT};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);}
@keyframes dots-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
.leaflet-container{background:#0b1622;}
`;

export interface MarkerIcon {
  html: string;
  /** Kantenlänge der quadratischen Icon-Box (Dot) — für Leaflet iconSize/anchor. */
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
  const size = markerSize(m.intensity, m.count, selected);
  const numFont = Math.max(10, Math.round(size * 0.46));
  const multi = m.count > 1;

  const glow = selected
    ? `0 0 0 4px rgba(108,92,255,.28),0 0 18px ${m.color},0 2px 6px rgba(0,0,0,.45)`
    : `0 0 10px ${m.color}cc,0 1px 4px rgba(0,0,0,.4)`;

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
    `<div class="dots-dot${selected ? ' is-sel' : ''}" ` +
    `style="width:${size}px;height:${size}px;background:${m.color};box-shadow:${glow};">` +
    `${num}${ring}${label}</div>`;

  return { html, size };
}
