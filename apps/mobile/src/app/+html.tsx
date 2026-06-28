import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML-Dokument für den Web-/Static-Export (Expo Router).
 * Ergänzt die PWA-/„Add to Home Screen"-Tags, damit die Web-Version sich auf dem
 * iPhone als App installieren lässt (Safari → Teilen → Zum Home-Bildschirm).
 *
 * `base` ist beim GitHub-Pages-Build '/dots' (Unterpfad), sonst leer — so stimmen
 * die absoluten Pfade zu Manifest/Icon sowohl in der Vorschau als auch auf Pages.
 */
export default function Root({ children }: PropsWithChildren) {
  const base = process.env.DOTS_PAGES ? '/dots' : '';
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        {/* Cache-Hinweise: iOS cacht das installierte Start-HTML hartnäckig.
            Diese Meta-Tags reduzieren die Wiederverwendung der alten Seite (kein
            voller Ersatz für HTTP-Header, aber hilft). JS-Bundles sind ohnehin
            content-gehasht und busten sich beim Neuladen selbst. */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />

        {/* PWA / Installierbarkeit */}
        <link rel="manifest" href={`${base}/manifest.json`} />
        {/* theme-color = Map-Farbe (Startbildschirm ist die dunkle Karte). */}
        <meta name="theme-color" content="#0b1622" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* black-translucent: die App füllt den GESAMTEN Bildschirm (auch unter
            Dynamic Island / Statusleiste) statt unter einem opaken weißen Balken
            zu starten. Erst dadurch meldet iOS echte safe-area-inset-Werte, die
            die App via SafeAreaProvider als oberen Abstand nutzt (kein weißer
            Spalt mehr, gleiches Bild wie in der Vorschau). */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="dots" />
        <link rel="apple-touch-icon" href={`${base}/apple-touch-icon.png`} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BODY_CSS }} />
      </head>
      <body>
        {children}
        {/* Versions-Stempel: bestätigt, dass das NEUE Bundle geladen ist (nicht
            der iOS-Cache). Sitzt direkt über dem Home-Indikator (Safe-Area) —
            ist der Text unten lesbar UND kein heller Streifen darunter, sitzt der
            untere Safe-Area-Fix. Bei jedem Deploy die Zahl hochzählen. */}
        <div
          id="dots-build"
          style={{
            position: 'fixed',
            right: '8px',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 2px)',
            zIndex: 99999,
            font: '9px -apple-system, sans-serif',
            color: 'rgba(255,255,255,0.55)',
            pointerEvents: 'none',
          }}>
          {BUILD_TAG}
        </div>
      </body>
    </html>
  );
}

// Bei jedem Pages-Deploy hochzählen, damit am Handy sichtbar ist, ob die neue
// Version geladen wurde (sonst Cache).
const BUILD_TAG = 'build v3';

const BODY_CSS = `
html, body, #root { height: 100%; }
/* iOS-Standalone-PWA: height:100% deckt die untere Safe-Area (Home-Indikator)
   nicht zuverlässig ab -> der weiße Body-Hintergrund scheint dort als Streifen
   durch. 100dvh = echte sichtbare Viewport-Höhe. */
@supports (height: 100dvh) {
  html, body, #root { height: 100dvh; }
}
/* Garantie-Fix für die INSTALLIERTE PWA: die App-Wurzel direkt am echten
   sichtbaren Viewport fixieren (inkl. aller Safe-Areas). So kann unten kein
   weißer Body mehr durchscheinen, egal wie iOS height/dvh auflöst. Nur im
   Standalone-Modus aktiv, damit der normale Browser-Tab (Tastatur/Scroll)
   unberührt bleibt. */
@media all and (display-mode: standalone) {
  html, body { height: 100%; overflow: hidden; }
  #root { position: fixed; top: 0; right: 0; bottom: 0; left: 0; height: auto; }
}
/* Canvas dunkel = Map-Farbe (#0b1622), in BEIDEN Schemata. Der Startbildschirm
   ist die dunkle Karte; falls iOS die Seite unter black-translucent kurz nach
   oben schiebt oder die Höhe spät auflöst, zeigt jede unbedeckte Lücke die
   Map-Farbe statt Weiß — unabhängig davon, ob @media(display-mode:standalone)
   matcht. Voll deckende App-Screens überdecken die Canvas wie gehabt. */
html, body { background-color: #0b1622; }
`;
