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
        {/* TEMPORÄRES Mess-Readout: zeigt Version + echte iOS-Viewport-Werte,
            damit der untere Rand punktgenau gefixt werden kann (statt zu raten).
            Wird wieder entfernt, sobald die Karte randlos sitzt. */}
        <div
          id="dots-build"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '88px',
            zIndex: 99999,
            font: '600 11px -apple-system, sans-serif',
            color: '#fff',
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 9px',
            borderRadius: '8px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
          {BUILD_TAG}
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function(){
              function probe(side){
                var p=document.createElement('div');
                p.style.cssText='position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-'+side+',0px)';
                document.body.appendChild(p);
                var v=getComputedStyle(p).paddingBottom; p.remove(); return v;
              }
              function read(){
                var r=document.getElementById('root');
                var rb=r?Math.round(r.getBoundingClientRect().bottom):'?';
                var el=document.getElementById('dots-build');
                if(el) el.textContent='${BUILD_TAG} ih'+window.innerHeight+' sh'+(window.screen&&window.screen.height)+' sab'+probe('bottom')+' rb'+rb;
              }
              window.addEventListener('load',function(){read();setTimeout(read,900);});
            })();
          `,
          }}
        />
      </body>
    </html>
  );
}

// Bei jedem Pages-Deploy hochzählen, damit am Handy sichtbar ist, ob die neue
// Version geladen wurde (sonst Cache).
const BUILD_TAG = 'v5';

const BODY_CSS = `
html, body, #root { height: 100%; }
html, body { margin: 0; overflow: hidden; }
@supports (height: 100dvh) {
  html, body { height: 100dvh; }
}
/* #root deckt IMMER den vollen sichtbaren Viewport ab (inkl. aller Safe-Areas,
   dank viewport-fit=cover). position:fixed + inset:0 ist auf iOS der zuverlässige
   Weg — height:100dvh lässt im installierten Standalone-Modus die untere
   Home-Indikator-Safe-Area aus (Karte reicht dann nicht bis zur Kante). BEWUSST
   NICHT an @media(display-mode:standalone) gekoppelt: iOS matcht das bei „Zum
   Home-Bildschirm"-Apps nicht zuverlässig, daher griff der frühere Fix nie. */
#root {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  /* Unterkante BEWUSST um die untere Safe-Area nach unten ziehen: falls iOS den
     Fixed-Viewport an der Home-Indikator-Kante enden lässt (dann blieb die Karte
     darüber stehen), reicht #root so garantiert bis zur physischen Kante. Auf
     Geräten ohne Inset (Desktop) ist env()=0 -> kein Effekt. */
  bottom: calc(-1 * env(safe-area-inset-bottom, 0px));
  height: auto;
  display: flex;
}
/* Canvas dunkel = Map-Farbe (#0b1622): falls iOS trotzdem irgendwo eine Lücke
   lässt, blendet sie in die Karte ein statt als weißer Streifen. */
html, body { background-color: #0b1622; }
`;
