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
      <body>{children}</body>
    </html>
  );
}

const BODY_CSS = `
html, body, #root { height: 100%; }
html, body { margin: 0; overflow: hidden; }
/* Volle physische Bildschirmhöhe für die installierte iOS-PWA. Messung am Gerät
   zeigte: height:100%/100dvh sperrte die App auf eine kürzere Höhe ein (ih=812
   bei Screen 874) -> die Karte endete vor der unteren Kante. 100lvh (large
   viewport) = größtmögliche Höhe inkl. Safe-Areas und füllt zuverlässig bis zur
   physischen Bildschirmkante. dvh als Fallback, lvh gewinnt wo unterstützt. */
@supports (height: 100dvh) {
  html, body, #root { height: 100dvh; }
}
@supports (height: 100lvh) {
  html, body, #root { height: 100lvh; }
}
/* Canvas dunkel = Map-Farbe (#0b1622): falls iOS doch eine Lücke lässt, blendet
   sie in die Karte ein statt als weißer Streifen. */
html, body { background-color: #0b1622; }
`;
