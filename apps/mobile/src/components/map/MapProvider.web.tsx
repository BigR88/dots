import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FRANKFURT_CENTER } from '@/lib/geo';
import { buildMarkerIcon, MARKER_CSS, MARKER_ZOOM } from '@/lib/map-markers';
import {
  DISTRICT_BOX,
  DISTRICT_CSS,
  districtLabelHtml,
  visibleDistricts,
} from '@/lib/districts';
import { HOT_AREA_CSS, HOT_AREA_MAX_ZOOM } from '@/lib/hot-areas';
import type { MapProviderProps } from './MapProvider';

// Sicht-Tabuzonen (px) für Stadtteil-Labels: nicht unter Header/Datumsleiste
// oben bzw. der schwebenden Tab-Leiste unten kleben.
const DISTRICT_SAFE_TOP = 160;
const DISTRICT_SAFE_BOTTOM = 120;

/**
 * MapProvider (Web) — echte Satelliten-Weltkarte via Leaflet (per CDN zur
 * Laufzeit geladen, sonst sprengt der window-Zugriff Expos Web-SSR). Zeigt EINEN
 * DOTS-Marker pro Standort: Farbe = Kategorie, Größe = Beliebtheit, Zahl = Anzahl
 * Events. Labels erscheinen progressiv mit dem Zoom (siehe lib/map-markers.ts).
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

// Marker-Styles (Dot, Auswahl-Ring/Pulse, Label, Nutzerstandort) einmalig laden.
function injectMarkerStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${MARKER_CSS}\n${DISTRICT_CSS}\n${HOT_AREA_CSS}\n.leaflet-container{font-family:inherit;}`;
  document.head.appendChild(style);
}

export function MapProvider({
  markers,
  hotAreas,
  userLocation,
  selectedKey,
  onSelectMarker,
  focus,
}: MapProviderProps) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  const tintRef = useRef<HTMLDivElement | null>(null);
  const districtRef = useRef<any>(null);
  const renderDistrictsRef = useRef<() => void>(() => {});
  const hotRef = useRef<any>(null);
  const hotDataRef = useRef(hotAreas);
  hotDataRef.current = hotAreas;
  const renderHotRef = useRef<() => void>(() => {});
  // Keys der aktuell beschrifteten Marker — nur DEREN Labels sind für Stadtteil-
  // Labels tabu (bei niedrigem Zoom ohne Event-Labels stehen Stadtteile frei).
  const labelledKeysRef = useRef<Set<string>>(new Set());
  const markersDataRef = useRef(markers);
  markersDataRef.current = markers;
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(FRANKFURT_ZOOM);
  const lastFocus = useRef(0);

  // Stadtteil-Labels rendern: zoomabhängig (visibleDistricts), nicht in den
  // Sicht-Tabuzonen oben/unten, und mit Vorrang für Event-Marker (Stadtteile
  // weichen Markern + sich gegenseitig nach Priorität aus). Pixelabstände hängen
  // am Zoom UND am Pan (Tabuzonen), daher Rebuild auch bei moveend.
  const renderDistricts = useCallback(() => {
    const L = window.L;
    const map = mapRef.current;
    const grp = districtRef.current;
    if (!L || !map || !grp) return;
    grp.clearLayers();
    const z = map.getZoom();
    const size = map.getSize();
    // Nur die Positionen BESCHRIFTETER Event-Marker sind tabu (deren Pills haben
    // Vorrang). Ohne Event-Labels (niedriger Zoom) stehen Stadtteile frei.
    const placed = markersDataRef.current
      .filter((m) => labelledKeysRef.current.has(m.key))
      .map((m) => map.latLngToContainerPoint([m.lat, m.lon]));
    visibleDistricts(z).forEach((d) => {
      const p = map.latLngToContainerPoint([d.lat, d.lon]);
      if (
        p.x < 10 ||
        p.x > size.x - 10 ||
        p.y < DISTRICT_SAFE_TOP ||
        p.y > size.y - DISTRICT_SAFE_BOTTOM
      )
        return;
      if (placed.some((q: any) => Math.abs(q.x - p.x) < 70 && Math.abs(q.y - p.y) < 40)) return;
      placed.push(p);
      const icon = L.divIcon({
        className: 'dots-district-icon',
        html: districtLabelHtml(d.name, z >= 16),
        iconSize: DISTRICT_BOX,
        iconAnchor: [DISTRICT_BOX[0] / 2, DISTRICT_BOX[1] / 2],
      });
      L.marker([d.lat, d.lon], { icon, pane: 'dotsDistricts', interactive: false, keyboard: false }).addTo(grp);
    });
  }, []);
  renderDistrictsRef.current = renderDistricts;

  // Hot Areas: weicher Glow ganz hinten, nur bei niedrigem/mittlerem Zoom.
  const renderHotAreas = useCallback(() => {
    const L = window.L;
    const map = mapRef.current;
    const grp = hotRef.current;
    if (!L || !map || !grp) return;
    grp.clearLayers();
    if (map.getZoom() > HOT_AREA_MAX_ZOOM) return;
    hotDataRef.current.forEach((a) => {
      const edge = [a.lat + (a.spreadM + 250) / 111320, a.lon];
      const pc = map.latLngToContainerPoint([a.lat, a.lon]);
      const pe = map.latLngToContainerPoint(edge);
      const d = Math.max(120, Math.min(320, Math.abs(pe.y - pc.y) * 2));
      const op = 0.55 + 0.45 * a.intensity;
      const icon = L.divIcon({
        className: 'dots-hot-icon',
        html: `<div class="dots-hot" style="width:${d}px;height:${d}px;opacity:${op}"></div>`,
        iconSize: [d, d],
        iconAnchor: [d / 2, d / 2],
      });
      L.marker([a.lat, a.lon], { icon, pane: 'dotsHot', interactive: false, keyboard: false }).addTo(grp);
    });
  }, []);
  renderHotRef.current = renderHotAreas;

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
        L.tileLayer(LABEL_TILES, { maxZoom: 19, opacity: 0.55 }).addTo(map);
        map.on('click', () => onSelectRef.current(null));
        map.on('zoomend', () => setZoom(map.getZoom()));

        // Nightlife-Vignette (viewport-fix) über der Karte; Mitte transparent.
        const tint = document.createElement('div');
        tint.className = 'dots-map-tint';
        el.appendChild(tint);
        tintRef.current = tint;

        // Hot-Area-Pane ganz hinten (über Kacheln, unter Stadtteilen/Markern).
        map.createPane('dotsHot');
        const hpane = map.getPane('dotsHot');
        if (hpane) {
          hpane.style.zIndex = '335';
          hpane.style.pointerEvents = 'none';
        }
        hotRef.current = L.layerGroup().addTo(map);

        // Eigener Pane für Stadtteil-Labels: über den Kacheln, UNTER den Markern.
        map.createPane('dotsDistricts');
        const dpane = map.getPane('dotsDistricts');
        if (dpane) {
          dpane.style.zIndex = '360';
          dpane.style.pointerEvents = 'none';
        }
        districtRef.current = L.layerGroup().addTo(map);
        map.on('moveend', () => {
          renderHotRef.current();
          renderDistrictsRef.current();
        });

        mapRef.current = map;
        markersRef.current = L.layerGroup().addTo(map);
        setTimeout(() => map.invalidateSize(), 60);
        setReady(true);
        renderHotRef.current();
        renderDistrictsRef.current();
      })
      .catch(() => {
        /* offline / CDN blockiert — Karte bleibt leer, App läuft weiter */
      });
    return () => {
      cancelled = true;
      tintRef.current?.remove();
      tintRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Standort-Pins (Venue-Gruppen) neu aufbauen — auch bei Zoomwechsel (Labels).
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const group = markersRef.current;
    if (!ready || !L || !map || !group) return;
    group.clearLayers();

    const showLabel = zoom >= MARKER_ZOOM.label;
    const showDetail = zoom >= MARKER_ZOOM.detail;

    // Label-Declutter: nur räumlich nicht-kollidierende Labels zeigen — Priorität
    // hat der ausgewählte Marker, danach Beliebtheit. Pixelabstände hängen nur am
    // Zoom (nicht am Pan), daher genügt ein Rebuild bei Zoomwechsel.
    const labelled = new Set<string>();
    if (showLabel) {
      const pts = markers.map((m) => ({ m, p: map.latLngToContainerPoint([m.lat, m.lon]) }));
      pts.sort((a, b) => {
        const sa = a.m.key === selectedKey ? 1 : 0;
        const sb = b.m.key === selectedKey ? 1 : 0;
        if (sa !== sb) return sb - sa;
        return b.m.intensity - a.m.intensity;
      });
      // Rechteckige Kollision statt Kreis: Labels sind breit (max-width 160px),
      // daher horizontal großzügiger Abstand, vertikal eng (Label-Höhe).
      const placed: { x: number; y: number }[] = [];
      const DX = 118;
      const DY = 26;
      for (const { m, p } of pts) {
        if (placed.some((q) => Math.abs(q.x - p.x) < DX && Math.abs(q.y - p.y) < DY)) continue;
        labelled.add(m.key);
        placed.push(p);
      }
    }
    labelledKeysRef.current = labelled;

    markers.forEach((m) => {
      const selected = m.key === selectedKey;
      const withLabel = showLabel && labelled.has(m.key);
      const { html, size } = buildMarkerIcon(m, {
        selected,
        showLabel: withLabel,
        showDetail: showDetail && withLabel,
      });
      const icon = L.divIcon({
        className: 'dots-marker-icon',
        html,
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

    // Stadtteil-Labels nach dem Marker-Rebuild aktualisieren (weichen Markern aus).
    renderDistricts();
  }, [markers, selectedKey, ready, zoom, renderDistricts]);

  // Hot Areas bei Zoom-/Daten-Änderung neu zeichnen (zoom-gated im Renderer).
  useEffect(() => {
    if (ready) renderHotAreas();
  }, [ready, zoom, hotAreas, renderHotAreas]);

  // Bei Auswahl sanft zum Pin schwenken (Sheet verdeckt unten). Nur an
  // `selectedKey` gekoppelt — reine Listen-Updates lösen kein Re-Pan aus.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedKey) return;
    const m = markersDataRef.current.find((x) => x.key === selectedKey);
    if (m) map.panTo([m.lat, m.lon], { animate: true });
  }, [selectedKey, ready]);

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
    const targetZoom = focus.zoom ?? Math.max(map.getZoom(), 15);
    map.flyTo([focus.point.lat, focus.point.lon], targetZoom, { duration: 0.8 });
  }, [focus, ready]);

  return <View nativeID={MAP_ID} style={styles.fill} />;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
