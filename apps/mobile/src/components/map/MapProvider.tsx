import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { GeoPoint } from '@dots/shared';
import { buildMarkerIcon, MARKER_CSS, MARKER_ZOOM } from '@/lib/map-markers';
import type { VenueMarker } from '@/lib/venues';

/**
 * MapProvider (Native) — echte Satelliten-Karte auf dem Gerät (WebView+Leaflet,
 * gleiche Quelle wie Web). Das Marker-HTML wird in TS gebaut (lib/map-markers.ts,
 * identisch zum Web) und per JSON in die WebView gereicht; die WebView ist nur
 * noch „dummer" Renderer. Labels erscheinen progressiv mit dem Zoom — dazu meldet
 * die WebView ihren Zoom zurück, und die Marker werden neu gebaut.
 */
export interface MapProviderProps {
  /** Gruppierte Standort-Marker (ein Pin je Venue). */
  markers: VenueMarker[];
  userLocation: GeoPoint | null;
  /** Schlüssel des aktiven Standorts (Venue-Gruppe). */
  selectedKey: string | null;
  onSelectMarker: (key: string | null) => void;
  /** Zielpunkt zum Hinfliegen (z. B. „mein Standort"); nonce stößt jedes Mal neu an. */
  focus?: { point: GeoPoint; nonce: number; zoom?: number } | null;
}

const FRANKFURT_ZOOM = 12.5;

// Selbst-genügsames HTML mit Leaflet. Marker-Styles kommen aus MARKER_CSS
// (geteilt mit Web); die Marker selbst werden als fertiges HTML eingespielt.
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{height:100%;margin:0;background:#0b1622}
  .leaflet-control-attribution{display:none}
  ${MARKER_CSS}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  function send(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
  var map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:11,maxZoom:19,maxBounds:[[49.85,8.3],[50.4,9.05]],maxBoundsViscosity:1,zoomSnap:.5}).setView([50.113,8.682],${FRANKFURT_ZOOM});
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.9}).addTo(map);
  map.on('click',function(){ send({type:'select',key:null}); });
  map.on('zoomend',function(){ send({type:'zoom',zoom:map.getZoom()}); });
  var group=L.layerGroup().addTo(map);
  var userMarker=null;
  window.setMarkers=function(list){
    group.clearLayers();
    (list||[]).forEach(function(m){
      var icon=L.divIcon({className:'dots-marker-icon',html:m.html,iconSize:[m.w,m.w],iconAnchor:[m.w/2,m.w/2]});
      var mk=L.marker([m.lat,m.lon],{icon:icon,zIndexOffset:m.sel?1000:0});
      mk.on('click',function(e){ if(e&&e.originalEvent){ L.DomEvent.stopPropagation(e.originalEvent); } send({type:'select',key:m.key}); });
      mk.addTo(group);
    });
  };
  window.setUser=function(loc){
    if(!loc){ if(userMarker){ map.removeLayer(userMarker); userMarker=null; } return; }
    var ll=[loc.lat,loc.lon];
    if(userMarker){ userMarker.setLatLng(ll); }
    else { userMarker=L.marker(ll,{icon:L.divIcon({className:'dots-user',html:'',iconSize:[22,22],iconAnchor:[11,11]}),interactive:false,zIndexOffset:500}).addTo(map); }
  };
  window.doFocus=function(f){ if(!f||!f.point)return; map.flyTo([f.point.lat,f.point.lon], f.zoom||Math.max(map.getZoom(),15), {duration:.8}); };
  window.doPan=function(p){ if(!p)return; map.panTo([p.lat,p.lon],{animate:true}); };
  setTimeout(function(){ map.invalidateSize(); send({type:'ready'}); },60);
})();
</script>
</body>
</html>`;

export function MapProvider({
  markers,
  userLocation,
  selectedKey,
  onSelectMarker,
  focus,
}: MapProviderProps) {
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const lastFocus = useRef(0);
  const [zoom, setZoom] = useState(FRANKFURT_ZOOM);
  const markersDataRef = useRef(markers);
  markersDataRef.current = markers;
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;

  const run = useCallback((js: string) => {
    webRef.current?.injectJavaScript(js + '; true;');
  }, []);

  const pushMarkers = useCallback(() => {
    // Marker-HTML in TS bauen (gleiche Quelle wie Web), nur Geometrie + HTML rein.
    const showLabel = zoom >= MARKER_ZOOM.label;
    const showDetail = zoom >= MARKER_ZOOM.detail;
    const payload = markers.map((m) => {
      const selected = m.key === selectedKey;
      const { html, size } = buildMarkerIcon(m, { selected, showLabel, showDetail });
      return { key: m.key, lat: m.lat, lon: m.lon, html, w: size, sel: selected };
    });
    run(`window.setMarkers && window.setMarkers(${JSON.stringify(payload)})`);
  }, [markers, selectedKey, zoom, run]);

  const pushUser = useCallback(() => {
    const loc = userLocation ? { lat: userLocation.lat, lon: userLocation.lon } : null;
    run(`window.setUser && window.setUser(${JSON.stringify(loc)})`);
  }, [userLocation, run]);

  useEffect(() => {
    if (ready.current) pushMarkers();
  }, [pushMarkers]);
  useEffect(() => {
    if (ready.current) pushUser();
  }, [pushUser]);
  useEffect(() => {
    if (ready.current && focus && focus.nonce !== lastFocus.current) {
      lastFocus.current = focus.nonce;
      run(`window.doFocus && window.doFocus(${JSON.stringify(focus)})`);
    }
  }, [focus, run]);

  // Bei Auswahl zum Pin schwenken (Parität zum Web; Sheet verdeckt unten).
  useEffect(() => {
    if (!ready.current || !selectedKey) return;
    const m = markersDataRef.current.find((x) => x.key === selectedKey);
    if (m) run(`window.doPan && window.doPan(${JSON.stringify({ lat: m.lat, lon: m.lon })})`);
  }, [selectedKey, run]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string; key?: string | null; zoom?: number };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') {
      ready.current = true;
      pushMarkers();
      pushUser();
      if (focus) {
        lastFocus.current = focus.nonce;
        run(`window.doFocus && window.doFocus(${JSON.stringify(focus)})`);
      }
    } else if (msg.type === 'zoom' && typeof msg.zoom === 'number') {
      setZoom(msg.zoom);
    } else if (msg.type === 'select') {
      onSelectRef.current(msg.key ?? null);
    }
  };

  return (
    <View style={styles.fill}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: MAP_HTML }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        startInLoadingState={false}
        style={styles.fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#0b1622' },
});
