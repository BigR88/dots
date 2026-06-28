import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { GeoPoint } from '@dots/shared';
import type { VenueMarker } from '@/lib/venues';

/**
 * MapProvider (Native) — echte Satelliten-Karte auf dem Gerät (WebView+Leaflet,
 * gleiche Quelle wie Web). Zeigt EINEN Pin pro Standort (Venue-Gruppe): Farbe =
 * Kategorie, Größe = Beliebtheit, Zahl = Anzahl Events am Standort.
 * Kommunikation via `postMessage` (Auswahl) / `injectJavaScript` (Daten rein).
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

// Selbst-genügsames HTML mit Leaflet. Pins: Lila-Skala nach Beliebtheit, Größe
// nach Beliebtheit/Anzahl, Zahl bei mehreren Events am selben Standort.
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{height:100%;margin:0;background:#0b1622}
  .dots-pin{border-radius:50%;display:flex;align-items:center;justify-content:center}
  .dots-user{width:22px;height:22px}
  .dots-user::before{content:'';position:absolute;inset:0;border-radius:50%;background:rgba(108,92,255,.35);animation:dp 1.8s ease-out infinite}
  .dots-user::after{content:'';position:absolute;top:50%;left:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#6C5CFF;border:3px solid #fff}
  @keyframes dp{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
  .leaflet-control-attribution{display:none}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  function send(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
  var map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:11,maxZoom:19,maxBounds:[[49.85,8.3],[50.4,9.05]],maxBoundsViscosity:1,zoomSnap:.5}).setView([50.113,8.682],12.5);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.9}).addTo(map);
  map.on('click',function(){ send({type:'select',key:null}); });
  var group=L.layerGroup().addTo(map);
  var userMarker=null;
  function pinSize(it,count,sel){ var base=count>1 ? 20+Math.min(count,6)*2+Math.round(it*4) : 11+Math.round(it*6); return sel?base+3:base; }
  function pinHtml(color,it,count,sel){ var s=pinSize(it,count,sel); var num=count>1 ? '<span style="color:#fff;font-weight:800;font-size:'+Math.max(10,Math.round(s*0.5))+'px;">'+count+'</span>' : ''; var glow=sel ? '0 0 16px '+color+',0 0 6px '+color+',0 1px 4px rgba(0,0,0,.45)' : '0 0 9px '+color+'cc,0 1px 3px rgba(0,0,0,.3)'; return '<div class="dots-pin" style="width:'+s+'px;height:'+s+'px;background:'+color+';box-shadow:'+glow+'">'+num+'</div>'; }
  window.setMarkers=function(markers,selectedKey){
    group.clearLayers();
    (markers||[]).forEach(function(m){
      var sel=m.key===selectedKey; var s=pinSize(m.intensity,m.count,sel);
      var icon=L.divIcon({className:'',html:pinHtml(m.color,m.intensity,m.count,sel),iconSize:[s,s],iconAnchor:[s/2,s/2]});
      var mk=L.marker([m.lat,m.lon],{icon:icon,zIndexOffset:sel?1000:0});
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
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;

  const run = useCallback((js: string) => {
    webRef.current?.injectJavaScript(js + '; true;');
  }, []);

  const pushMarkers = useCallback(() => {
    run(`window.setMarkers && window.setMarkers(${JSON.stringify(markers)}, ${JSON.stringify(selectedKey)})`);
  }, [markers, selectedKey, run]);

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

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string; key?: string | null };
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
        // iOS: KEINE automatische Safe-Area-Einrückung — sonst schiebt WKWebView
        // den Karteninhalt unter der Dynamic Island nach unten und legt einen
        // weißen Streifen (Default-Hintergrund des ScrollViews) frei. Der dunkle
        // Container-Hintergrund (#0b1622) deckt das kurze Laden ab.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        style={styles.fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#0b1622' },
});
