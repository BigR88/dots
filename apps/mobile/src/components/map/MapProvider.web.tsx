import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import 'leaflet/dist/leaflet.css';
import { FRANKFURT_CENTER } from '@/lib/geo';
import { buildClusterIcon, buildMarkerIcon, MARKER_CSS, MARKER_ZOOM } from '@/lib/map-markers';
import { clusterMarkers } from '@/lib/map-clusters';
import {
  DISTRICT_BOX,
  DISTRICT_CSS,
  districtLabelHtml,
  visibleDistricts,
} from '@/lib/districts';
import {
  ENERGY_ZONES,
  ENERGY_ZONE_MAX_ZOOM,
  energyZoneHtml,
  HOT_AREA_CSS,
  HOT_AREA_MAX_ZOOM,
  nightEnergyFactor,
} from '@/lib/hot-areas';
import type { MapProviderProps } from './MapProvider';

// Sicht-Tabuzonen (px) für Stadtteil-Labels: nicht unter Header/Datumsleiste
// oben bzw. der schwebenden Tab-Leiste unten kleben.
const DISTRICT_SAFE_TOP = 160;
const DISTRICT_SAFE_BOTTOM = 120;

// Exit-Animation der Marker (muss zur CSS-Dauer von dots-out passen).
const MARKER_EXIT_MS = 240;
// Gestaffelter Eintritt neuer Marker: pro Marker etwas später, gedeckelt.
const ENTER_STAGGER_MS = 24;
const ENTER_STAGGER_MAX_MS = 200;

/**
 * MapProvider (Web) — echte Weltkarte via Leaflet. Leaflet kommt gebündelt aus
 * node_modules (dynamischer import zur Laufzeit, sonst sprengt der window-
 * Zugriff Expos Web-SSR) — kein CDN, funktioniert auch offline. Zeigt EINEN
 * DOTS-Marker pro Standort: Farbe = Kategorie, Größe = Beliebtheit, Zahl = Anzahl
 * Events. Labels erscheinen progressiv mit dem Zoom (siehe lib/map-markers.ts).
 */

const FRANKFURT_ZOOM = 12.5;
const FRANKFURT_BOUNDS: [[number, number], [number, number]] = [
  [49.85, 8.3],
  [50.4, 9.05],
];

// Label-FREIE helle Basemap (CARTO voyager_nolabels): dezent warm, keine
// Autobahn-Schilder, keine doppelten Ortsnamen — die DOTS-Distrikt-Labels sind
// die EINZIGE Beschriftung der Übersicht. Straßennamen kommen als eigene Ebene
// erst beim tiefen Reinzoomen dazu (Orientierung an der Venue). Kein API-Key nötig.
const BASE_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
const LABEL_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';
/** Straßennamen-Ebene erst ab diesem Zoom (Venue-Nähe). */
const LABEL_MIN_ZOOM = 15.5;
/** Städtenamen-Ebene nur ganz rausgezoomt (Region: Frankfurt, Offenbach, …);
 *  darüber übernehmen die DOTS-Distrikt-Labels (ab 12.4) — keine Doppelungen. */
const OVERVIEW_LABEL_MAX_ZOOM = 12.4;
const ESRI_ATTR = '&copy; CARTO &copy; OpenStreetMap contributors';

const MAP_ID = 'dots-leaflet-map';
const STYLE_ID = 'dots-leaflet-style';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    L?: any;
  }
}

let leafletPromise: Promise<any> | null = null;

// Leaflet aus dem Bundle laden — dynamisch, damit der window-Zugriff des UMD-
// Moduls nicht schon beim SSR-Prerender (Node) ausgeführt wird.
function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = import('leaflet').then((mod: any) => {
      const L = mod?.default ?? mod;
      window.L = L; // die Render-Effekte greifen über window.L zu
      return L;
    });
    // Fehlgeschlagenes Laden (z. B. Chunk offline nicht im Cache) darf einen
    // erneuten Versuch nicht blockieren.
    leafletPromise.catch(() => {
      leafletPromise = null;
    });
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
  const fixSizeRef = useRef<(() => void) | null>(null);
  const markersRef = useRef<any>(null);
  // Lebende Leaflet-Marker je Key (keyed Diff statt clearLayers): erlaubt
  // Enter-Animation nur für NEUE Keys und Exit-Animation für entfernte.
  const liveMarkersRef = useRef(
    new Map<string, { marker: any; html: string; size: number; exitTimer: ReturnType<typeof setTimeout> | null }>(),
  );
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
  // Leaflet konnte nicht geladen werden → sichtbarer Fallback statt leerer Karte;
  // retryNonce stößt die Initialisierung erneut an.
  const [loadError, setLoadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
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
        html: districtLabelHtml(d.name, z >= 16, d.nightlife),
        iconSize: DISTRICT_BOX,
        iconAnchor: [DISTRICT_BOX[0] / 2, DISTRICT_BOX[1] / 2],
      });
      L.marker([d.lat, d.lon], { icon, pane: 'dotsDistricts', interactive: false, keyboard: false }).addTo(grp);
    });
  }, []);
  renderDistrictsRef.current = renderDistricts;

  // Hot Areas + Energie-Zonen: weiche Glows ganz hinten. Zonen = statische
  // Nightlife-Atmosphäre der bekannten Viertel; Hot Areas = Daten-Hotspots.
  const renderHotAreas = useCallback(() => {
    const L = window.L;
    const map = mapRef.current;
    const grp = hotRef.current;
    if (!L || !map || !grp) return;
    grp.clearLayers();
    const zoom = map.getZoom();
    const pxDiameter = (lat: number, lon: number, radiusM: number) => {
      const pc = map.latLngToContainerPoint([lat, lon]);
      const pe = map.latLngToContainerPoint([lat + radiusM / 111320, lon]);
      return Math.abs(pe.y - pc.y) * 2;
    };
    // Tageszeit-Energie: abends/nachts glühen die Zonen voll, tagsüber gedimmt.
    const energy = nightEnergyFactor();
    if (zoom <= ENERGY_ZONE_MAX_ZOOM) {
      ENERGY_ZONES.forEach((z, i) => {
        const d = Math.max(90, Math.min(420, pxDiameter(z.lat, z.lon, z.radiusM)));
        const icon = L.divIcon({
          className: 'dots-hot-icon',
          html: energyZoneHtml(z, d, energy, i * 1.3),
          iconSize: [d, d],
          iconAnchor: [d / 2, d / 2],
        });
        L.marker([z.lat, z.lon], { icon, pane: 'dotsHot', interactive: false, keyboard: false }).addTo(grp);
      });
    }
    if (zoom > HOT_AREA_MAX_ZOOM) return;
    hotDataRef.current.forEach((a, i) => {
      const d = Math.max(120, Math.min(320, pxDiameter(a.lat, a.lon, a.spreadM + 250)));
      // Daten-Hotspots dimmen schwächer als die Ambient-Zonen (sqrt) — echte
      // Event-Dichte bleibt auch tagsüber deutlich sichtbar.
      const op = (0.55 + 0.45 * a.intensity) * Math.sqrt(energy);
      const icon = L.divIcon({
        className: 'dots-hot-icon',
        html: `<div class="dots-hot" style="width:${d}px;height:${d}px;opacity:${op}"><i style="animation-delay:-${i * 1.7}s"></i></div>`,
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

        L.tileLayer(BASE_TILES, { maxZoom: 19, attribution: ESRI_ATTR }).addTo(map);
        L.tileLayer(LABEL_TILES, { maxZoom: 19, minZoom: LABEL_MIN_ZOOM, opacity: 0.85 }).addTo(map);
        L.tileLayer(LABEL_TILES, { minZoom: 11, maxZoom: OVERVIEW_LABEL_MAX_ZOOM, opacity: 0.8 }).addTo(map);
        map.on('click', () => onSelectRef.current(null));
        map.on('zoomend', () => setZoom(map.getZoom()));

        // Marken-Vignette (viewport-fix) über der Karte; Mitte transparent.
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
        // moveend: NUR Stadtteil-Labels neu setzen (deren Tabuzonen hängen am
        // Pan). Hot-Areas/Energie-Zonen hängen allein am Zoom — die rendert der
        // zoom-Effekt; sie bei jedem Pan neu zu bauen wäre unnötiger DOM-Churn
        // (Leaflet verschiebt bestehende Marker beim Pannen selbst).
        map.on('moveend', () => renderDistrictsRef.current());

        mapRef.current = map;
        if (process.env.NODE_ENV !== 'production') (window as any).__dotsMap = map; // Debug-Zugriff im Dev
        markersRef.current = L.layerGroup().addTo(map);
        // iOS-Standalone-PWA: 100dvh / Safe-Area-Insets stehen erst NACH dem
        // ersten Paint final fest. Ein einzelnes invalidateSize(60ms) misst eine
        // zu kurze Höhe -> Leaflet fixiert seine Panes ~34px über der unteren
        // Kante und der Screen-Hintergrund scheint als Streifen durch. Daher
        // über mehrere Frames neu vermessen + bei jeder Viewport-Änderung.
        const fixSize = () => map.invalidateSize();
        fixSizeRef.current = fixSize;
        requestAnimationFrame(fixSize);
        [60, 200, 500, 1000].forEach((d) => setTimeout(fixSize, d));
        window.addEventListener('resize', fixSize);
        window.visualViewport?.addEventListener('resize', fixSize);
        window.addEventListener('orientationchange', fixSize);
        setReady(true);
        renderHotRef.current();
        renderDistrictsRef.current();
      })
      .catch(() => {
        // Leaflet-Chunk nicht ladbar (z. B. offline beim ersten Start) →
        // sichtbarer Fallback mit „Erneut versuchen" statt leerer Karte.
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
      if (fixSizeRef.current) {
        window.removeEventListener('resize', fixSizeRef.current);
        window.visualViewport?.removeEventListener('resize', fixSizeRef.current);
        window.removeEventListener('orientationchange', fixSizeRef.current);
        fixSizeRef.current = null;
      }
      tintRef.current?.remove();
      tintRef.current = null;
      liveMarkersRef.current.forEach((e) => e.exitTimer && clearTimeout(e.exitTimer));
      liveMarkersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [retryNonce]);

  // Standort-Pins per keyed Diff aktualisieren (statt clearLayers): neue Marker
  // blühen gestaffelt auf, entfernte schrumpfen weg, bestehende werden nur per
  // setIcon aktualisiert — Filterwechsel fühlen sich dadurch flüssig an.
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const group = markersRef.current;
    if (!ready || !L || !map || !group) return;

    // Bei niedrigem Zoom: nah beieinander liegende Venues zu Cluster-Bubbles
    // zusammenfassen (Tipp = hineinzoomen); darüber einzelne Venue-Dots.
    const { singles, clusters } = clusterMarkers(markers, zoom);

    const showLabel = zoom >= MARKER_ZOOM.label;
    const showDetail = zoom >= MARKER_ZOOM.detail;

    // Label-Declutter: nur räumlich nicht-kollidierende Labels zeigen — Priorität
    // hat der ausgewählte Marker, danach Beliebtheit. Pixelabstände hängen nur am
    // Zoom (nicht am Pan), daher genügt ein Rebuild bei Zoomwechsel.
    const labelled = new Set<string>();
    if (showLabel) {
      const pts = singles.map((m) => ({ m, p: map.latLngToContainerPoint([m.lat, m.lon]) }));
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
    } else {
      // Smart-Callouts: die Top-2-Trending-Venues bleiben auch weit rausgezoomt
      // beschriftet — Ankerpunkte fürs Auge („da ist heute was los").
      [...singles]
        .filter((m) => m.hot && !m.past)
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 2)
        .forEach((m) => labelled.add(m.key));
    }
    labelledKeysRef.current = labelled;

    // Render-Liste: Venue-Dots + Cluster-Bubbles mit stabilen Keys.
    type Item = { key: string; lat: number; lon: number; html: string; size: number; aria: string; z: number; onClick: (e: any) => void };
    const items: Item[] = [];
    // Screenreader-Name direkt aufs fokussierbare Leaflet-Element (Leaflet macht
    // Marker per keyboard-Option tabbable, gibt ihnen aber keinen Namen).
    const applyA11y = (marker: any, aria: string) => {
      const el = marker.getElement?.();
      if (el) {
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', aria);
      }
    };
    singles.forEach((m) => {
      const selected = m.key === selectedKey;
      const withLabel = labelled.has(m.key);
      const { html, size, ariaLabel } = buildMarkerIcon(m, {
        selected,
        showLabel: withLabel,
        showDetail: showDetail && withLabel,
      });
      items.push({
        key: m.key,
        lat: m.lat,
        lon: m.lon,
        html,
        size,
        aria: ariaLabel,
        z: selected ? 1000 : m.hot ? 300 : 0,
        onClick: (e: any) => {
          if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          onSelectRef.current(m.key);
        },
      });
    });
    clusters.forEach((c) => {
      const { html, size, ariaLabel } = buildClusterIcon(c);
      items.push({
        key: c.key,
        lat: c.lat,
        lon: c.lon,
        html,
        size,
        aria: ariaLabel,
        z: 100,
        onClick: (e: any) => {
          if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          // Ziel-Zoom immer ÜBER der Cluster-Schwelle — sonst landet der Tap
          // wieder in einem Cluster und fühlt sich wirkungslos an.
          const target = Math.min(Math.max(map.getZoom() + 1.7, 14), MARKER_ZOOM.label);
          map.flyTo([c.lat, c.lon], target, { duration: 0.55 });
        },
      });
    });

    const live = liveMarkersRef.current;
    const nextKeys = new Set(items.map((i) => i.key));

    // Entfernte Marker: Exit-Animation, dann wirklich entfernen.
    live.forEach((entry, key) => {
      if (nextKeys.has(key) || entry.exitTimer) return;
      entry.marker.off('click');
      entry.marker.setIcon(
        L.divIcon({
          className: 'dots-marker-icon dots-anim-out',
          html: entry.html,
          iconSize: [entry.size, entry.size],
          iconAnchor: [entry.size / 2, entry.size / 2],
        }),
      );
      entry.exitTimer = setTimeout(() => {
        group.removeLayer(entry.marker);
        live.delete(key);
      }, MARKER_EXIT_MS);
    });

    // Neue/bestehende Marker: anlegen mit Enter-Animation bzw. Icon updaten.
    let enterIdx = 0;
    items.forEach((it) => {
      const existing = live.get(it.key);
      if (existing) {
        // Kommt ein Key zurück, während er noch weg-animiert → Exit abbrechen.
        const wasExiting = existing.exitTimer != null;
        if (existing.exitTimer) {
          clearTimeout(existing.exitTimer);
          existing.exitTimer = null;
        }
        if (wasExiting) {
          existing.marker.on('click', it.onClick);
        }
        // setIcon nur bei echter Änderung — sonst starten laufende
        // CSS-Animationen (Halo, Live-Ring) bei jedem now-Tick neu.
        if (wasExiting || existing.html !== it.html) {
          existing.marker.setIcon(
            L.divIcon({
              className: 'dots-marker-icon',
              html: it.html,
              iconSize: [it.size, it.size],
              iconAnchor: [it.size / 2, it.size / 2],
            }),
          );
          existing.html = it.html;
          existing.size = it.size;
          // setIcon ersetzt das DOM-Element → ARIA-Attribute neu setzen.
          applyA11y(existing.marker, it.aria);
        }
        existing.marker.setZIndexOffset(it.z);
      } else {
        const icon = L.divIcon({
          className: 'dots-marker-icon dots-anim-in',
          html: it.html,
          iconSize: [it.size, it.size],
          iconAnchor: [it.size / 2, it.size / 2],
        });
        const marker = L.marker([it.lat, it.lon], { icon, zIndexOffset: it.z, riseOnHover: true });
        marker.on('click', it.onClick);
        marker.addTo(group);
        applyA11y(marker, it.aria);
        // Gestaffelter Eintritt: animation-delay direkt aufs animierte Element.
        const delay = Math.min(enterIdx * ENTER_STAGGER_MS, ENTER_STAGGER_MAX_MS);
        enterIdx += 1;
        const el = marker.getElement()?.querySelector('.dots-marker') as HTMLElement | null;
        if (el && delay > 0) el.style.animationDelay = `${delay}ms`;
        live.set(it.key, { marker, html: it.html, size: it.size, exitTimer: null });
      }
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

  return (
    <View style={styles.fill}>
      <View nativeID={MAP_ID} style={styles.fill} />
      {loadError && (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Karte konnte nicht geladen werden.</Text>
          <Text style={styles.fallbackHint}>Bitte Verbindung prüfen — die Events bleiben verfügbar.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLoadError(false);
              setRetryNonce((n) => n + 1);
            }}
            style={({ pressed }) => [styles.fallbackBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.fallbackBtnText}>Erneut versuchen</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: '#f2efe9',
  },
  fallbackTitle: { fontSize: 15, fontWeight: '700', color: '#2c2650', textAlign: 'center' },
  fallbackHint: { fontSize: 13, color: '#6b6590', textAlign: 'center' },
  fallbackBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#6C5CE7',
  },
  fallbackBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
