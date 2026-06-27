import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { GeoPoint } from '@dots/shared';
import { buildMarkerIcon, MARKER_CSS, MARKER_ZOOM } from '@/lib/map-markers';
import { DISTRICTS, DISTRICT_CSS } from '@/lib/districts';
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
  ${DISTRICT_CSS}
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
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.55}).addTo(map);
  map.on('click',function(){ send({type:'select',key:null}); });
  map.on('zoomend',function(){ send({type:'zoom',zoom:map.getZoom()}); });
  var tint=document.createElement('div'); tint.className='dots-map-tint'; document.getElementById('map').appendChild(tint);
  // Stadtteil-Labels: eigener Pane über den Kacheln, unter den Markern.
  map.createPane('dotsDistricts'); map.getPane('dotsDistricts').style.zIndex=360; map.getPane('dotsDistricts').style.pointerEvents='none';
  var DISTRICTS=${JSON.stringify(DISTRICTS)};
  var dgrp=L.layerGroup().addTo(map);
  var labelledLL=[]; // LatLngs der beschrifteten Marker — nur deren Labels sind tabu
  function renderDistricts(){
    dgrp.clearLayers();
    var z=map.getZoom(), size=map.getSize(), TOP=160, BOT=120, EDGE=10;
    var placed=labelledLL.map(function(ll){ return map.latLngToContainerPoint(ll); });
    DISTRICTS.filter(function(d){ return z>=d.minZoom && (d.maxZoom==null||z<=d.maxZoom); })
      .sort(function(a,b){ return b.priority-a.priority; })
      .forEach(function(d){
        var p=map.latLngToContainerPoint([d.lat,d.lon]);
        if(p.x<EDGE||p.x>size.x-EDGE||p.y<TOP||p.y>size.y-BOT) return;
        if(placed.some(function(q){ return Math.abs(q.x-p.x)<70 && Math.abs(q.y-p.y)<40; })) return;
        placed.push(p);
        var dim=z>=16;
        var icon=L.divIcon({className:'dots-district-icon',html:'<div class="dots-district'+(dim?' is-dim':'')+'">'+d.name+'</div>',iconSize:[170,20],iconAnchor:[85,10]});
        L.marker([d.lat,d.lon],{icon:icon,pane:'dotsDistricts',interactive:false,keyboard:false}).addTo(dgrp);
      });
  }
  map.on('zoomend moveend',renderDistricts);
  var group=L.layerGroup().addTo(map);
  var userMarker=null;
  window.setMarkers=function(list){
    group.clearLayers();
    list=list||[];
    // Label-Declutter (Parität zum Web): nur kollisionsfreie Labels — Priorität
    // Auswahl, dann Beliebtheit; rechteckige Kollision (Labels sind breit).
    var withLabel={};
    if(list.length){
      var pts=list.map(function(m){ return {m:m,p:map.latLngToContainerPoint([m.lat,m.lon])}; });
      pts.sort(function(a,b){ var sa=a.m.sel?1:0, sb=b.m.sel?1:0; if(sa!==sb)return sb-sa; return (b.m.intensity||0)-(a.m.intensity||0); });
      var pl=[];
      pts.forEach(function(o){ if(!o.m.canLabel)return; if(pl.some(function(q){return Math.abs(q.x-o.p.x)<118 && Math.abs(q.y-o.p.y)<26;}))return; pl.push(o.p); withLabel[o.m.key]=true; });
    }
    labelledLL=list.filter(function(m){return withLabel[m.key];}).map(function(m){return [m.lat,m.lon];});
    list.forEach(function(m){
      var icon=L.divIcon({className:'dots-marker-icon',html:withLabel[m.key]?m.htmlL:m.htmlP,iconSize:[m.w,m.w],iconAnchor:[m.w/2,m.w/2]});
      var mk=L.marker([m.lat,m.lon],{icon:icon,zIndexOffset:m.sel?1000:0});
      mk.on('click',function(e){ if(e&&e.originalEvent){ L.DomEvent.stopPropagation(e.originalEvent); } send({type:'select',key:m.key}); });
      mk.addTo(group);
    });
    renderDistricts();
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
    // Marker-HTML in TS bauen (gleiche Quelle wie Web). Pro Marker zwei Varianten
    // (mit/ohne Label) + canLabel — den Declutter macht die WebView per Projektion.
    const canLabel = zoom >= MARKER_ZOOM.label;
    const showDetail = zoom >= MARKER_ZOOM.detail;
    const payload = markers.map((m) => {
      const selected = m.key === selectedKey;
      const labeled = buildMarkerIcon(m, { selected, showLabel: true, showDetail });
      const plain = buildMarkerIcon(m, { selected, showLabel: false, showDetail: false });
      return {
        key: m.key,
        lat: m.lat,
        lon: m.lon,
        w: plain.size,
        sel: selected,
        intensity: m.intensity,
        canLabel,
        htmlL: labeled.html,
        htmlP: plain.html,
      };
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
