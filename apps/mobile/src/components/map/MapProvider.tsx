import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { GeoPoint } from '@dots/shared';
import { buildClusterIcon, buildMarkerIcon, MARKER_CSS, MARKER_ZOOM } from '@/lib/map-markers';
import { clusterMarkers } from '@/lib/map-clusters';
import { DISTRICTS, DISTRICT_CSS } from '@/lib/districts';
import {
  ENERGY_ZONES,
  ENERGY_ZONE_MAX_ZOOM,
  HOT_AREA_CSS,
  HOT_AREA_MAX_ZOOM,
  type HotArea,
} from '@/lib/hot-areas';
import type { VenueMarker } from '@/lib/venues';

/**
 * MapProvider (Native) — echte Weltkarte auf dem Gerät (WebView+Leaflet,
 * gleiche Quelle wie Web). Das Marker-HTML wird in TS gebaut (lib/map-markers.ts,
 * identisch zum Web) und per JSON in die WebView gereicht; die WebView ist nur
 * noch „dummer" Renderer. Labels erscheinen progressiv mit dem Zoom — dazu meldet
 * die WebView ihren Zoom zurück, und die Marker werden neu gebaut.
 */
export interface MapProviderProps {
  /** Gruppierte Standort-Marker (ein Pin je Venue). */
  markers: VenueMarker[];
  /** Dynamische Event-Dichte (weicher Glow, zoomabhängig). */
  hotAreas: HotArea[];
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
  html,body,#map{height:100%;margin:0;background:#f2efe9}
  .leaflet-control-attribution{display:none}
  ${MARKER_CSS}
  ${DISTRICT_CSS}
  ${HOT_AREA_CSS}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  function send(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
  var map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:11,maxZoom:19,maxBounds:[[49.85,8.3],[50.4,9.05]],maxBoundsViscosity:1,zoomSnap:.5}).setView([50.113,8.682],${FRANKFURT_ZOOM});
  // Label-freie helle Basemap (voyager) + Namen in zwei Fenstern: Städte ganz
  // rausgezoomt, Straßen erst ab Venue-Zoom — dazwischen DOTS-Labels (Parität zum Web).
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',{maxZoom:19,minZoom:15.5,opacity:.85}).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',{minZoom:11,maxZoom:12.4,opacity:.8}).addTo(map);
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
        var icon=L.divIcon({className:'dots-district-icon',html:'<div class="dots-district'+(d.nightlife?' is-night':'')+(dim?' is-dim':'')+'">'+d.name+'</div>',iconSize:[170,20],iconAnchor:[85,10]});
        L.marker([d.lat,d.lon],{icon:icon,pane:'dotsDistricts',interactive:false,keyboard:false}).addTo(dgrp);
      });
  }
  map.on('zoomend moveend',renderDistricts);
  // Hot Areas + Energie-Zonen: weiche Glows ganz hinten (über Kacheln, unter
  // allem anderen), zoom-gated. Zonen = statische Nightlife-Atmosphäre.
  map.createPane('dotsHot'); map.getPane('dotsHot').style.zIndex=335; map.getPane('dotsHot').style.pointerEvents='none';
  var hgrp=L.layerGroup().addTo(map);
  var HOT=[]; var HOT_MAX_Z=${HOT_AREA_MAX_ZOOM};
  var ZONES=${JSON.stringify(ENERGY_ZONES)}; var ZONE_MAX_Z=${ENERGY_ZONE_MAX_ZOOM};
  function pxDiameter(lat,lon,radiusM){
    var pc=map.latLngToContainerPoint([lat,lon]);
    var pe=map.latLngToContainerPoint([lat+radiusM/111320,lon]);
    return Math.abs(pe.y-pc.y)*2;
  }
  // Tageszeit-Energie (Parität zu lib/hot-areas.ts nightEnergyFactor).
  function nightEnergy(){
    var now=new Date(); var h=now.getHours()+now.getMinutes()/60;
    if(h>=21||h<4) return 1;
    if(h>=16) return 0.5+0.5*((h-16)/5);
    if(h<8) return 1-0.5*((h-4)/4);
    return 0.5;
  }
  function renderHot(){
    hgrp.clearLayers();
    var z=map.getZoom();
    var energy=nightEnergy();
    if(z<=ZONE_MAX_Z){
      ZONES.forEach(function(zn,i){
        var d=Math.max(90,Math.min(420,pxDiameter(zn.lat,zn.lon,zn.radiusM)));
        var html='<div class="dots-zone" style="width:'+d+'px;height:'+d+'px;opacity:'+energy+'"><i style="background:radial-gradient(circle, '+zn.color+'30 0%, '+zn.color+'1c 42%, '+zn.color+'00 72%);animation-delay:-'+(i*1.3)+'s"></i></div>';
        var icon=L.divIcon({className:'dots-hot-icon',html:html,iconSize:[d,d],iconAnchor:[d/2,d/2]});
        L.marker([zn.lat,zn.lon],{icon:icon,pane:'dotsHot',interactive:false,keyboard:false}).addTo(hgrp);
      });
    }
    if(z>HOT_MAX_Z) return;
    HOT.forEach(function(a,i){
      var d=Math.max(120,Math.min(320,pxDiameter(a.lat,a.lon,a.spreadM+250)));
      var op=(0.55+0.45*(a.intensity||0))*Math.sqrt(energy);
      var icon=L.divIcon({className:'dots-hot-icon',html:'<div class="dots-hot" style="width:'+d+'px;height:'+d+'px;opacity:'+op+'"><i style="animation-delay:-'+(i*1.7)+'s"></i></div>',iconSize:[d,d],iconAnchor:[d/2,d/2]});
      L.marker([a.lat,a.lon],{icon:icon,pane:'dotsHot',interactive:false,keyboard:false}).addTo(hgrp);
    });
  }
  window.setHotAreas=function(list){ HOT=list||[]; renderHot(); };
  // Nur zoomend: Glow-Größen hängen allein am Zoom — beim Pannen verschiebt
  // Leaflet die bestehenden Marker selbst (kein Rebuild nötig).
  map.on('zoomend',renderHot);
  var group=L.layerGroup().addTo(map);
  var userMarker=null;
  // Keyed Diff (Parität zum Web): neue Marker blühen gestaffelt auf, entfernte
  // schrumpfen weg, bestehende nur setIcon bei echter Änderung.
  var live={};
  function markerClick(m){
    return function(e){
      if(e&&e.originalEvent){ L.DomEvent.stopPropagation(e.originalEvent); }
      if(m.cl){ map.flyTo([m.lat,m.lon],Math.min(Math.max(map.getZoom()+1.7,14),${MARKER_ZOOM.label}),{duration:.55}); }
      else { send({type:'select',key:m.key}); }
    };
  }
  window.setMarkers=function(list){
    list=list||[];
    // Label-Declutter: nur kollisionsfreie Labels — Priorität Auswahl, dann
    // Beliebtheit; rechteckige Kollision (Labels sind breit).
    var withLabel={};
    if(list.length){
      var pts=list.map(function(m){ return {m:m,p:map.latLngToContainerPoint([m.lat,m.lon])}; });
      pts.sort(function(a,b){ var sa=a.m.sel?1:0, sb=b.m.sel?1:0; if(sa!==sb)return sb-sa; return (b.m.intensity||0)-(a.m.intensity||0); });
      var pl=[];
      pts.forEach(function(o){ if(!o.m.canLabel)return; if(pl.some(function(q){return Math.abs(q.x-o.p.x)<118 && Math.abs(q.y-o.p.y)<26;}))return; pl.push(o.p); withLabel[o.m.key]=true; });
    }
    labelledLL=list.filter(function(m){return withLabel[m.key];}).map(function(m){return [m.lat,m.lon];});
    var next={};
    list.forEach(function(m){ next[m.key]=1; });
    Object.keys(live).forEach(function(k){
      var e=live[k];
      if(next[k]||e.t) return;
      e.mk.off('click');
      e.mk.setIcon(L.divIcon({className:'dots-marker-icon dots-anim-out',html:e.h,iconSize:[e.w,e.w],iconAnchor:[e.w/2,e.w/2]}));
      e.t=setTimeout(function(){ group.removeLayer(e.mk); delete live[k]; },240);
    });
    // Screenreader-Name aufs fokussierbare Leaflet-Element (Parität zum Web).
    function applyA11y(mk,m){
      var el=mk.getElement();
      if(el){ el.setAttribute('role','button'); el.setAttribute('aria-label',m.aria||''); }
    }
    var ni=0;
    list.forEach(function(m){
      var h=withLabel[m.key]?m.htmlL:m.htmlP;
      var z=m.sel?1000:(m.cl?100:(m.hot?300:0));
      var e=live[m.key];
      if(e){
        var back=!!e.t;
        if(e.t){ clearTimeout(e.t); e.t=null; }
        if(back){ e.mk.on('click',markerClick(m)); }
        if(back||e.h!==h||e.w!==m.w){
          e.mk.setIcon(L.divIcon({className:'dots-marker-icon',html:h,iconSize:[m.w,m.w],iconAnchor:[m.w/2,m.w/2]}));
          e.h=h; e.w=m.w;
          applyA11y(e.mk,m); // setIcon ersetzt das DOM-Element
        }
        e.mk.setZIndexOffset(z);
      } else {
        var icon=L.divIcon({className:'dots-marker-icon dots-anim-in',html:h,iconSize:[m.w,m.w],iconAnchor:[m.w/2,m.w/2]});
        var mk=L.marker([m.lat,m.lon],{icon:icon,zIndexOffset:z});
        mk.on('click',markerClick(m));
        mk.addTo(group);
        applyA11y(mk,m);
        var el=mk.getElement()&&mk.getElement().querySelector('.dots-marker');
        var delay=Math.min(ni*24,200); ni++;
        if(el&&delay>0){ el.style.animationDelay=delay+'ms'; }
        live[m.key]={mk:mk,h:h,w:m.w,t:null};
      }
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
  hotAreas,
  userLocation,
  selectedKey,
  onSelectMarker,
  focus,
}: MapProviderProps) {
  const webRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
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
    // Bei niedrigem Zoom: Proximity-Cluster statt einzelner Venue-Dots.
    const { singles, clusters } = clusterMarkers(markers, zoom);
    const canLabelZoom = zoom >= MARKER_ZOOM.label;
    const showDetail = zoom >= MARKER_ZOOM.detail;
    // Smart-Callouts: Top-2-Trending bleiben auch weit rausgezoomt beschriftet.
    const callouts = new Set(
      canLabelZoom
        ? []
        : [...singles]
            .filter((m) => m.hot && !m.past)
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, 2)
            .map((m) => m.key),
    );
    const payload: object[] = singles.map((m) => {
      const selected = m.key === selectedKey;
      const labeled = buildMarkerIcon(m, { selected, showLabel: true, showDetail });
      const plain = buildMarkerIcon(m, { selected, showLabel: false, showDetail: false });
      return {
        key: m.key,
        lat: m.lat,
        lon: m.lon,
        w: plain.size,
        sel: selected,
        hot: m.hot,
        intensity: m.intensity,
        canLabel: canLabelZoom || callouts.has(m.key),
        htmlL: labeled.html,
        htmlP: plain.html,
        aria: plain.ariaLabel,
      };
    });
    clusters.forEach((c) => {
      const icon = buildClusterIcon(c);
      payload.push({
        key: c.key,
        lat: c.lat,
        lon: c.lon,
        w: icon.size,
        cl: 1,
        intensity: c.intensity,
        canLabel: false,
        htmlL: icon.html,
        htmlP: icon.html,
        aria: icon.ariaLabel,
      });
    });
    run(`window.setMarkers && window.setMarkers(${JSON.stringify(payload)})`);
  }, [markers, selectedKey, zoom, run]);

  const pushUser = useCallback(() => {
    const loc = userLocation ? { lat: userLocation.lat, lon: userLocation.lon } : null;
    run(`window.setUser && window.setUser(${JSON.stringify(loc)})`);
  }, [userLocation, run]);

  const pushHot = useCallback(() => {
    run(`window.setHotAreas && window.setHotAreas(${JSON.stringify(hotAreas)})`);
  }, [hotAreas, run]);

  useEffect(() => {
    if (ready.current) pushMarkers();
  }, [pushMarkers]);
  useEffect(() => {
    if (ready.current) pushUser();
  }, [pushUser]);
  useEffect(() => {
    if (ready.current) pushHot();
  }, [pushHot]);
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
      pushHot();
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
        // iOS: KEINE automatische Safe-Area-Einrückung — sonst schiebt WKWebView
        // den Karteninhalt unter der Dynamic Island nach unten und legt einen
        // Streifen (Default-Hintergrund des ScrollViews) frei. Der Container-
        // Hintergrund in Karten-Grundfarbe (#f2efe9) deckt das kurze Laden ab.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        style={styles.fill}
      />
      {/* Lizenzpflichtige Quellenangabe (OSM/ODbL + CARTO) — dezent, nicht tippbar. */}
      <View pointerEvents="none" style={[styles.attribution, { bottom: insets.bottom + 4 }]}>
        <Text style={styles.attributionText}>© OpenStreetMap-Mitwirkende · © CARTO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#f2efe9' },
  attribution: {
    position: 'absolute',
    left: 6,
    bottom: 4,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  attributionText: { fontSize: 9, color: '#4a4664' },
});
