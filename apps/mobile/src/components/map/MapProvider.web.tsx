import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DotsEvent, GeoPoint } from '@dots/shared';
import { FRANKFURT_CENTER } from '@/lib/geo';
import type { MapProviderProps } from './MapProvider';

/**
 * MapProvider (Web) — echte Satelliten-Weltkarte via Leaflet.
 *
 * Leaflet wird bewusst erst zur Laufzeit per CDN nachgeladen (kein top-level
 * import): die Lib greift beim Import auf `window`/`document` zu, was Expos
 * Web-SSR sonst sprengen würde. Satelliten-Kacheln kommen von Esri World
 * Imagery (frei, kein Token), plus eine dezente Beschriftungs-Ebene.
 */

const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
// Die App fokussiert (vorerst) Frankfurt + nahen Umkreis: Start-Zoom auf die
// Stadt, kein Heraus­zoomen zur Weltkarte, Pan begrenzt auf die Region.
const FRANKFURT_ZOOM = 12.5;
const FRANKFURT_BOUNDS: [[number, number], [number, number]] = [
  [49.85, 8.3], // Süd-West (Richtung Darmstadt/Mainz)
  [50.4, 9.05], // Nord-Ost (Richtung Bad Homburg/Hanau)
];

// Event-Pins bewusst klein halten — kleiner als der Standortpunkt (Kern 14px)
// zur besseren Unterscheidung.
const PIN_SIZE = 10;
const PIN_SIZE_SEL = 14;
const SAT_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABEL_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTR =
  'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

const MAP_ID = 'dots-leaflet-map';
const STYLE_ID = 'dots-leaflet-style';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    L?: any;
  }
}

let leafletPromise: Promise<any> | null = null;

function injectOnce(tag: 'link' | 'script', attrs: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const sel = `${tag}[data-dots="${attrs['data-dots']}"]`;
    if (document.querySelector(sel)) return resolve();
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    el.addEventListener('load', () => resolve());
    el.addEventListener('error', () => reject(new Error(`Laden fehlgeschlagen: ${attrs.href ?? attrs.src}`)));
    document.head.appendChild(el);
  });
}

function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = Promise.all([
      injectOnce('link', { rel: 'stylesheet', href: LEAFLET_CSS, 'data-dots': 'leaflet-css' }),
      injectOnce('script', { src: LEAFLET_JS, 'data-dots': 'leaflet-js' }),
    ]).then(() => window.L);
  }
  return leafletPromise;
}

// Eigene Marker-/Standort-Styles (Glanz-Punkt im „dots"-Look + Puls).
function injectMarkerStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dots-pin { border-radius: 50%; transition: transform .12s ease; }
    .dots-user { width: 22px; height: 22px; }
    .dots-user::before { content:''; position:absolute; inset:0; border-radius:50%;
      background: rgba(108,92,255,.35); animation: dots-pulse 1.8s ease-out infinite; }
    .dots-user::after { content:''; position:absolute; top:50%; left:50%; width:14px; height:14px;
      margin:-7px 0 0 -7px; border-radius:50%; background:#6C5CFF; border:3px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.4); }
    @keyframes dots-pulse { 0%{transform:scale(.6);opacity:.9} 100%{transform:scale(2.4);opacity:0} }
    .leaflet-container { background:#0b1622; font-family: inherit; }
  `;
  document.head.appendChild(style);
}

// Dunklerer Ton derselben Farbe (für den Ring um den Punkt).
function darken(hex: string, f: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Durchscheinende „Zone" um den Punkt: wächst & wird intensiver mit der Zahl
// der Zusagen (count). Gedeckelt, damit sehr beliebte Events nicht alles fluten.
function zoneDiameter(size: number, count: number): number {
  return size + 18 + Math.min(count, 14) * 4;
}
function zoneAlphaHex(count: number): string {
  const a = Math.min(0.55, 0.18 + Math.min(count, 14) * 0.035);
  return Math.round(a * 255).toString(16).padStart(2, '0');
}

function pinHtml(color: string, selected: boolean, count: number): string {
  const size = selected ? PIN_SIZE_SEL : PIN_SIZE;
  const dark = darken(color, 0.55); // Ring = dunklerer Ton derselben Farbe
  const ringW = selected ? 3 : 2;
  const zone = zoneDiameter(size, count);
  const alpha = zoneAlphaHex(count);
  return `<div style="width:${zone}px;height:${zone}px;border-radius:50%;background:${color}${alpha};display:flex;align-items:center;justify-content:center;">
    <div class="dots-pin${selected ? ' dots-pin--sel' : ''}" style="width:${size}px;height:${size}px;background:${color};box-shadow:0 0 0 ${ringW}px ${dark};"></div>
  </div>`;
}

export function MapProvider({
  events,
  userLocation,
  selectedId,
  onSelectEvent,
  focus,
  attendance,
}: MapProviderProps) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectEvent);
  onSelectRef.current = onSelectEvent;
  const [ready, setReady] = useState(false);
  const lastFocus = useRef(0);

  // Karte einmalig initialisieren.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled) return;
        injectMarkerStyles();
        const el = document.getElementById(MAP_ID);
        if (!el || (el as any)._leaflet_id) return;
        const map = L.map(el, {
          zoomControl: false,
          // Keine Attribution-Leiste (inkl. Leaflet-/Ukraine-Flaggen-Prefix) für den
          // cleanen, immersiven Look. Hinweis: Für Produktion einen dezenten
          // „© Esri"-Credit wieder einblenden (Esri-Nutzungsbedingungen).
          attributionControl: false,
          // App ist (vorerst) Frankfurt-only: nicht zur Weltkarte heraus­zoomen
          // und Pan an die Region binden.
          minZoom: 11,
          maxZoom: 19,
          maxBounds: FRANKFURT_BOUNDS,
          maxBoundsViscosity: 1,
          zoomSnap: 0.5,
        }).setView([FRANKFURT_CENTER.lat, FRANKFURT_CENTER.lon], FRANKFURT_ZOOM);

        L.tileLayer(SAT_TILES, { maxZoom: 19, attribution: ESRI_ATTR }).addTo(map);
        L.tileLayer(LABEL_TILES, { maxZoom: 19, opacity: 0.9 }).addTo(map);
        map.on('click', () => onSelectRef.current(null));

        mapRef.current = map;
        markersRef.current = L.layerGroup().addTo(map);
        // Container-Größe steht im iPhone-Frame manchmal erst nach einem Tick.
        setTimeout(() => map.invalidateSize(), 60);
        setReady(true);
      })
      .catch(() => {
        /* offline / CDN blockiert — Karte bleibt leer, App läuft weiter */
      });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Event-Pins neu aufbauen.
  useEffect(() => {
    const L = window.L;
    const group = markersRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    events.forEach((ev) => {
      if (!ev.location) return;
      const selected = ev.id === selectedId;
      const size = selected ? PIN_SIZE_SEL : PIN_SIZE;
      const count = attendance?.[ev.id] ?? 0;
      const zone = zoneDiameter(size, count);
      const icon = L.divIcon({
        className: 'dots-pin-wrap',
        html: pinHtml(ev.category?.color ?? '#7A5CFF', selected, count),
        iconSize: [zone, zone],
        iconAnchor: [zone / 2, zone / 2],
      });
      const marker = L.marker([ev.location.lat, ev.location.lon], {
        icon,
        zIndexOffset: selected ? 1000 : 0,
        riseOnHover: true,
      });
      marker.on('click', (e: any) => {
        if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
        onSelectRef.current(ev);
      });
      marker.addTo(group);
    });
  }, [events, selectedId, ready, attendance]);

  // Bei Auswahl sanft zum Pin schwenken (Vorschau-Sheet verdeckt unten).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedId) return;
    const ev = events.find((e) => e.id === selectedId);
    if (ev?.location) map.panTo([ev.location.lat, ev.location.lon], { animate: true });
  }, [selectedId, ready, events]);

  // Nutzerstandort-Marker.
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (!userLocation) {
      userRef.current?.remove();
      userRef.current = null;
      return;
    }
    const latlng = [userLocation.lat, userLocation.lon];
    if (userRef.current) {
      userRef.current.setLatLng(latlng);
    } else {
      const icon = L.divIcon({ className: 'dots-user', html: '', iconSize: [22, 22], iconAnchor: [11, 11] });
      userRef.current = L.marker(latlng, { icon, interactive: false, zIndexOffset: 500 }).addTo(map);
    }
  }, [userLocation, ready]);

  // Externer Fokus (z. B. „mein Standort"-Button).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    if (focus.nonce === lastFocus.current) return;
    lastFocus.current = focus.nonce;
    const zoom = focus.zoom ?? Math.max(map.getZoom(), 15);
    map.flyTo([focus.point.lat, focus.point.lon], zoom, { duration: 0.8 });
  }, [focus, ready]);

  return <View nativeID={MAP_ID} style={styles.fill} />;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
