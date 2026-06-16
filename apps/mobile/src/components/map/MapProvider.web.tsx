import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FRANKFURT_CENTER } from '@/lib/geo';
import type { MapProviderProps } from './MapProvider';

/**
 * MapProvider (Web) — echte Satelliten-Weltkarte via Leaflet (per CDN zur
 * Laufzeit geladen, sonst sprengt der window-Zugriff Expos Web-SSR). Zeigt EINEN
 * Pin pro Standort: Farbe = Kategorie, Größe = Beliebtheit, Zahl = Anzahl Events.
 */

const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const FRANKFURT_ZOOM = 12.5;
const FRANKFURT_BOUNDS: [[number, number], [number, number]] = [
  [49.85, 8.3],
  [50.4, 9.05],
];

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

function injectMarkerStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dots-pin { border-radius:50%; display:flex; align-items:center; justify-content:center;
      transition: transform .12s ease; }
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

// Größe bewusst zierlich: ein einzelnes Event = kleiner Punkt; mehrere am
// Standort = etwas größer + Zahl. Beliebtere Locations minimal größer.
function pinSize(intensity: number, count: number, selected: boolean): number {
  const base =
    count > 1 ? 20 + Math.min(count, 6) * 2 + Math.round(intensity * 4) : 11 + Math.round(intensity * 6);
  return selected ? base + 3 : base;
}

// Keine weiße Umrandung — stattdessen ein farbiges Leuchten (Glow) in der
// Kategorie-Farbe, damit die Pins kräftig „leuchten".
function pinHtml(color: string, intensity: number, count: number, selected: boolean): string {
  const s = pinSize(intensity, count, selected);
  const num =
    count > 1
      ? `<span style="color:#fff;font-weight:800;font-size:${Math.max(10, Math.round(s * 0.5))}px;">${count}</span>`
      : '';
  const glow = selected
    ? `0 0 16px ${color},0 0 6px ${color},0 1px 4px rgba(0,0,0,.45)`
    : `0 0 9px ${color}cc,0 1px 3px rgba(0,0,0,.3)`;
  return `<div class="dots-pin" style="width:${s}px;height:${s}px;background:${color};box-shadow:${glow};">${num}</div>`;
}

export function MapProvider({
  markers,
  userLocation,
  selectedKey,
  onSelectMarker,
  focus,
}: MapProviderProps) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;
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
          attributionControl: false,
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

  // Standort-Pins (Venue-Gruppen) neu aufbauen.
  useEffect(() => {
    const L = window.L;
    const group = markersRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    markers.forEach((m) => {
      const selected = m.key === selectedKey;
      const size = pinSize(m.intensity, m.count, selected);
      const icon = L.divIcon({
        className: 'dots-pin-wrap',
        html: pinHtml(m.color, m.intensity, m.count, selected),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([m.lat, m.lon], {
        icon,
        zIndexOffset: selected ? 1000 : 0,
        riseOnHover: true,
      });
      marker.on('click', (e: any) => {
        if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
        onSelectRef.current(m.key);
      });
      marker.addTo(group);
    });
  }, [markers, selectedKey, ready]);

  // Bei Auswahl sanft zum Pin schwenken (Sheet verdeckt unten).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedKey) return;
    const m = markers.find((x) => x.key === selectedKey);
    if (m) map.panTo([m.lat, m.lon], { animate: true });
  }, [selectedKey, ready, markers]);

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
