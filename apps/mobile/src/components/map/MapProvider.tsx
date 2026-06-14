import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { DotsEvent, GeoPoint } from '@dots/shared';

/**
 * MapProvider (Native) — echte Satelliten-Karte auf dem Gerät.
 *
 * Statt einer eigenen Demo-Karte rendern wir dieselbe Leaflet-/Esri-Satelliten-
 * karte wie im Web (siehe MapProvider.web.tsx), hier eingebettet in eine
 * `WebView` (läuft in Expo Go, ohne eigenen Native-Build/Map-Token). Pins (mit
 * farbigem Schein), Auswahl und „mein Standort" verhalten sich identisch.
 * Die Kommunikation läuft über `postMessage` (Auswahl) bzw. `injectJavaScript`
 * (Daten rein). Beide Plattformen teilen dieselbe Prop-Signatur.
 */
export interface MapProviderProps {
  events: DotsEvent[];
  userLocation: GeoPoint | null;
  selectedId: string | null;
  onSelectEvent: (event: DotsEvent | null) => void;
  /** Zielpunkt zum Hinfliegen (z. B. „mein Standort"); nonce stößt jedes Mal neu an. */
  focus?: { point: GeoPoint; nonce: number; zoom?: number } | null;
  /** Zusagen je Event (eventId → Anzahl) — steuert Größe/Intensität der Zone um den Punkt. */
  attendance?: Record<string, number>;
}

// Selbst-genügsames HTML-Dokument mit Leaflet + Heat-Plugin (von unpkg/Esri,
// dieselben Quellen wie im Web). Definiert window.set* / window.doFocus, die von
// React per injectJavaScript gefüttert werden, und meldet Auswahl + „ready"
// zurück über window.ReactNativeWebView.postMessage.
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{height:100%;margin:0;background:#0b1622}
  .dots-pin{border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.5)}
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
  map.on('click',function(){ send({type:'select',id:null}); });
  var group=L.layerGroup().addTo(map);
  var userMarker=null;
  function darken(hex,f){ var h=hex.replace('#',''); if(h.length===3){h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];} var n=parseInt(h,16); function c(x){ x=Math.round(x*f); return ('0'+x.toString(16)).slice(-2); } return '#'+c((n>>16)&255)+c((n>>8)&255)+c(n&255); }
  function zoneDiameter(size,count){ return size+18+Math.min(count,14)*4; }
  function zoneAlpha(count){ var a=Math.min(0.55,0.18+Math.min(count,14)*0.035); var x=Math.round(a*255); return ('0'+x.toString(16)).slice(-2); }
  function pinHtml(color,sel,count){ var s=sel?14:10; var dark=darken(color,0.55); var ringW=sel?3:2; var z=zoneDiameter(s,count); var a=zoneAlpha(count); return '<div style="width:'+z+'px;height:'+z+'px;border-radius:50%;background:'+color+a+';display:flex;align-items:center;justify-content:center;"><div class="dots-pin'+(sel?' dots-pin--sel':'')+'" style="width:'+s+'px;height:'+s+'px;background:'+color+';box-shadow:0 0 0 '+ringW+'px '+dark+';"></div></div>'; }
  window.setMarkers=function(events,selectedId){
    group.clearLayers();
    (events||[]).forEach(function(ev){
      var sel=ev.id===selectedId; var s=sel?14:10; var count=ev.count||0; var z=zoneDiameter(s,count);
      var icon=L.divIcon({className:'',html:pinHtml(ev.color||'#7A5CFF',sel,count),iconSize:[z,z],iconAnchor:[z/2,z/2]});
      var m=L.marker([ev.lat,ev.lon],{icon:icon,zIndexOffset:sel?1000:0});
      m.on('click',function(e){ if(e&&e.originalEvent){ L.DomEvent.stopPropagation(e.originalEvent); } send({type:'select',id:ev.id}); });
      m.addTo(group);
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
  events,
  userLocation,
  selectedId,
  onSelectEvent,
  focus,
  attendance,
}: MapProviderProps) {
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const lastFocus = useRef(0);
  const onSelectRef = useRef(onSelectEvent);
  onSelectRef.current = onSelectEvent;

  const run = useCallback((js: string) => {
    webRef.current?.injectJavaScript(js + '; true;');
  }, []);

  const pushMarkers = useCallback(() => {
    const data = events
      .filter((e) => e.location)
      .map((e) => ({
        id: e.id,
        lat: e.location!.lat,
        lon: e.location!.lon,
        color: e.category?.color ?? '#7A5CFF',
        count: attendance?.[e.id] ?? 0,
      }));
    run(`window.setMarkers && window.setMarkers(${JSON.stringify(data)}, ${JSON.stringify(selectedId)})`);
  }, [events, selectedId, attendance, run]);

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
    let msg: { type?: string; id?: string | null };
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
      const ev = msg.id ? events.find((x) => x.id === msg.id) ?? null : null;
      onSelectRef.current(ev);
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
