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
  /** Live-Status (nur heute): 'live' → sanfter Puls, 'soon' → ruhiger Ring. */
  status?: 'live' | 'soon' | null;
  /** Alle Events am Standort vorbei → Marker dezenter. */
  past?: boolean;
  /** Trending-Hotspot: größerer Dot mit atmendem Glow-Halo. */
  hot?: boolean;
}

/** Transparenter Tap-Halo rund um den Dot (bessere Tappbarkeit ohne mehr Optik). */
export const MARKER_HIT_PAD = 7;

/** Dot-Durchmesser in px: Regular klein, Trending/mehrere Events größer. */
export function markerSize(intensity: number, count: number, selected: boolean, hot = false): number {
  const base =
    count > 1
      ? 22 + Math.min(count, 6) * 3 + Math.round(intensity * 4)
      : 12 + Math.round(intensity * 6) + (hot ? 5 : 0);
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
/* BEWUSST kein CSS-Filter auf .leaflet-tile-pane: ein Filter über allen Kacheln
   zwingt Mobile-GPUs bei jedem Pan/Zoom-Frame durch einen Repaint — Voyager ist
   hell genug, die Marker tragen auch ungefiltert. */
/* Sanfte Atmosphäre über der hellen Karte (Mitte bleibt frei, damit Marker
   tragen): dezente Lila-Vignette + hauchdünner Marken-Wash am unteren Rand.
   z-index 450: ÜBER dem Leaflet-Map-Pane (400), sonst läge das Overlay hinter
   den opaken Kacheln und wäre unsichtbar. */
.dots-map-tint{position:absolute;inset:0;z-index:450;pointer-events:none;
  background:
    radial-gradient(118% 88% at 50% 40%, rgba(124,108,255,0) 60%, rgba(124,108,255,.10) 100%),
    linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 30%, rgba(108,92,255,.05) 100%);}
.dots-marker-icon{background:transparent!important;border:0!important;}
.dots-marker{position:relative;display:flex;align-items:center;justify-content:center;}
/* Eintritt/Austritt: Marker blühen beim Filtern sanft auf bzw. schrumpfen weg.
   Die Klassen setzt der Host auf dem Icon-Element (nur für NEUE bzw. entfernte
   Marker) — Zoom-Rebuilds derselben Keys animieren nicht. */
.dots-anim-in .dots-marker{animation:dots-in .42s cubic-bezier(.18,1.3,.4,1) backwards;}
.dots-anim-out .dots-marker{animation:dots-out .22s ease-in forwards;animation-delay:0ms!important;}
@keyframes dots-in{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes dots-out{to{transform:scale(.4);opacity:0}}
.dots-dot{position:relative;border-radius:50%;display:flex;align-items:center;justify-content:center;
  border:1.5px solid rgba(255,255,255,.9);box-sizing:border-box;color:#fff;line-height:1;
  transition:transform .15s ease;}
.dots-dot__n{font-weight:800;color:#fff;}
.dots-dot.is-sel{border-color:#fff;z-index:1000;}
/* Atmender Energie-Halo hinter Trending-/Live-Markern (Farbe inline via --halo).
   Zentrier-Transform + Ruhe-Opacity liegen im Basis-Stil, damit der Halo auch
   OHNE Animation (prefers-reduced-motion) korrekt zentriert und gedimmt ist. */
.dots-halo{position:absolute;left:50%;top:50%;width:230%;height:230%;border-radius:50%;
  pointer-events:none;background:radial-gradient(circle, var(--halo) 0%, rgba(0,0,0,0) 62%);
  transform:translate(-50%,-50%);opacity:.55;
  animation:dots-breathe 2.8s ease-in-out infinite;}
@keyframes dots-breathe{0%,100%{transform:translate(-50%,-50%) scale(.82);opacity:.4}50%{transform:translate(-50%,-50%) scale(1.12);opacity:.72}}
/* Cluster-Bubble: dunkles Glas mit Lila-Kante — „mehrere Events in dieser Gegend".
   Bewusst dunkel gehalten: klarer Kontrast-Anker auf der hellen Karte.
   Tipp darauf zoomt hinein (kein Venue-Select). */
.dots-cluster{position:relative;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(circle at 32% 26%, rgba(84,66,160,.95) 0%, rgba(26,20,52,.95) 70%);
  border:1.5px solid rgba(196,182,255,.8);box-sizing:border-box;color:#fff;line-height:1;
  box-shadow:0 0 0 4px rgba(108,92,255,.14),0 0 20px rgba(108,92,255,.35),0 4px 16px rgba(31,26,64,.3);}
.dots-cluster__n{font-weight:800;letter-spacing:-.3px;}
.dots-cluster__u{font-size:8px;font-weight:700;letter-spacing:.5px;opacity:.72;margin-top:2px;text-transform:uppercase;}
.dots-ring{position:absolute;inset:-8px;border-radius:50%;border:3px solid ${ACCENT};
  pointer-events:none;animation:dots-ping 1.7s cubic-bezier(0,0,.2,1) infinite;}
/* „Läuft jetzt": sanfter, langsamer Puls in Kategorie-Farbe (border-color inline). */
.dots-ring--live{border-width:2.5px;animation-duration:2.2s;}
/* „Startet bald": ruhiger statischer Ring, kein Blinken. */
.dots-ring--soon{border-width:2px;animation:none;opacity:.6;}
@keyframes dots-ping{0%{transform:scale(.7);opacity:.8}80%{opacity:0}100%{transform:scale(2.05);opacity:0}}
/* Deckkraft trägt die Lesbarkeit — BEWUSST kein backdrop-filter: die Labels
   bewegen sich mit jedem Karten-Frame, Blur dahinter müsste pro Frame neu
   berechnet werden (spürbares Ruckeln auf Mobile). */
.dots-label{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);
  max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background:rgba(13,12,22,.9);color:#fff;font-size:11px;font-weight:700;letter-spacing:-.1px;
  padding:4px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.16);
  text-shadow:0 1px 2px rgba(0,0,0,.55);
  box-shadow:0 6px 18px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.08);
  text-align:center;pointer-events:none;}
.dots-label__sub{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:600;opacity:.8;margin-top:1px;letter-spacing:0;}
.dots-user{width:22px;height:22px;}
.dots-user::before{content:'';position:absolute;inset:0;border-radius:50%;background:rgba(108,92,255,.35);animation:dots-pulse 1.8s ease-out infinite;}
.dots-user::after{content:'';position:absolute;top:50%;left:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:${ACCENT};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);}
@keyframes dots-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
.leaflet-container{background:#f2efe9;}
/* Barrierefreiheit: reduzierte Bewegung → dauerhafte Animationen aus (Enter/Exit bleiben, sie sind einmalig + kurz). */
@media (prefers-reduced-motion: reduce){.dots-halo,.dots-ring,.dots-hot i,.dots-user::before{animation:none!important;}}
`;

export interface MarkerIcon {
  html: string;
  /** Kantenlänge der quadratischen Icon-Box (Dot + Tap-Halo) — Leaflet iconSize/anchor. */
  size: number;
  /** Screenreader-Name des Markers (die Hosts setzen ihn aufs Leaflet-Element). */
  ariaLabel: string;
}

/** Screenreader-Label eines Venue-Markers: Name, Event-Zahl, Genre, Live-Status. */
export function markerAriaLabel(m: MarkerInput): string {
  const what = m.count > 1 ? `${m.count} Events` : [m.genre, m.timeLabel].filter(Boolean).join(', ') || '1 Event';
  const status =
    m.status === 'live' ? ', läuft gerade' : m.status === 'soon' ? ', startet bald' : m.past ? ', bereits vorbei' : '';
  return `${m.venueName}: ${what}${status}`;
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
  const hot = !!m.hot && !m.past;
  const dot = markerSize(m.intensity, m.count, selected, hot);
  const box = dot + MARKER_HIT_PAD * 2; // transparenter Tap-Halo rundherum
  const numFont = Math.max(10, Math.round(dot * 0.46));
  const multi = m.count > 1;

  // Ausgewählter Marker mit kräftigem Lila-Ring + Glow; Trending-Marker leuchten
  // stärker in ihrer Kategorie-Farbe. Schlagschatten weich (helle Basemap).
  const glow = selected
    ? `0 0 0 3px rgba(108,92,255,.95),0 0 14px ${ACCENT},0 0 22px ${m.color}99,0 2px 8px rgba(31,26,64,.3)`
    : hot
      ? `0 0 12px ${m.color}e6,0 0 26px ${m.color}73,0 2px 6px rgba(31,26,64,.28)`
      : `0 0 8px ${m.color}cc,0 2px 6px rgba(31,26,64,.28)`;

  const num = multi ? `<span class="dots-dot__n" style="font-size:${numFont}px">${m.count}</span>` : '';

  // Atmender Energie-Halo: Trending-Hotspots + „läuft jetzt" (Kategorie-Farbe).
  // Negative, aus dem Venue-Namen abgeleitete Phase: die Halos atmen versetzt
  // statt mechanisch im Gleichtakt.
  const haloPhase = (m.venueName.length % 8) * 0.35;
  const halo =
    (hot || m.status === 'live') && !selected
      ? `<span class="dots-halo" style="--halo:${m.color}59;animation-delay:-${haloPhase}s"></span>`
      : '';

  // Ring-Priorität: ausgewählt (Lila) > läuft jetzt > startet bald.
  let ring = '';
  if (selected) ring = '<span class="dots-ring"></span>';
  else if (m.status === 'live')
    ring = `<span class="dots-ring dots-ring--live" style="border-color:${m.color}"></span>`;
  else if (m.status === 'soon')
    ring = `<span class="dots-ring dots-ring--soon" style="border-color:${m.color}"></span>`;

  // Vorbei (heute) → dezenter Marker, sofern nicht ausgewählt.
  const dim = m.past && !selected ? ';opacity:.5' : '';

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
    `<div class="dots-marker" style="width:${box}px;height:${box}px;">${halo}` +
    `<div class="dots-dot${selected ? ' is-sel' : ''}" ` +
    `style="width:${dot}px;height:${dot}px;background:${m.color};box-shadow:${glow}${dim};">` +
    `${num}${ring}${label}</div>` +
    `</div>`;

  return { html, size: box, ariaLabel: markerAriaLabel(m) };
}

/** Felder, die ein Cluster-Marker zum Rendern braucht (strukturell = ClusterMarker). */
export interface ClusterInput {
  /** Summe der Events im Cluster (Zahl in der Bubble). */
  count: number;
  /** Mindestens ein Trending-Hotspot im Cluster → Glow-Halo. */
  hot: boolean;
}

/**
 * Cluster-Bubble für „mehrere Venues in dieser Gegend" (nur bei niedrigem Zoom).
 * Dunkles Glas mit Lila-Kante — bewusst KEINE Kategorie-Farbe, damit sie klar
 * als Aggregat lesbar ist. Tipp darauf zoomt hinein.
 */
export function buildClusterIcon(c: ClusterInput): MarkerIcon {
  const d = 34 + Math.min(c.count, 14); // 36..48 px, wächst mit der Event-Zahl
  const box = d + MARKER_HIT_PAD * 2;
  const halo = c.hot
    ? `<span class="dots-halo" style="--halo:#8B7BFF59;animation-delay:-${(c.count % 7) * 0.4}s"></span>`
    : '';
  const sub = d >= 40 ? '<span class="dots-cluster__u">Events</span>' : '';
  const html =
    `<div class="dots-marker" style="width:${box}px;height:${box}px;">${halo}` +
    `<div class="dots-cluster" style="width:${d}px;height:${d}px">` +
    `<span class="dots-cluster__n" style="font-size:${Math.round(d * 0.38)}px">${c.count}</span>${sub}</div>` +
    `</div>`;
  return {
    html,
    size: box,
    ariaLabel: `${c.count} Events in dieser Gegend — tippen zum Vergrößern`,
  };
}
