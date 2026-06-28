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

        {/* PWA / Installierbarkeit */}
        <link rel="manifest" href={`${base}/manifest.json`} />
        <meta name="theme-color" content="#F7F8FC" />
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
/* iOS-Standalone-PWA: height:100% deckt die untere Safe-Area (Home-Indikator)
   nicht zuverlässig ab -> der weiße Body-Hintergrund scheint dort als Streifen
   durch. 100dvh = echte sichtbare Viewport-Höhe. Auf ALLE drei Ebenen (html,
   body, #root) angewandt, damit der Body (overflow:hidden) nichts abschneidet
   und die App bis zur Bildschirmkante reicht. */
@supports (height: 100dvh) {
  html, body, #root { height: 100dvh; }
}
html, body { background-color: #F7F8FC; }
@media (prefers-color-scheme: dark) { html, body { background-color: #0B0B0F; } }
`;
