/**
 * Integrierte Anleitung — erklärt dots Studio und den KI-Import-Agenten
 * ausführlich auf Deutsch. Reine Inhaltsseite (Server Component, kein JS).
 */
export default function AnleitungPage() {
  return (
    <div className="guide">
      <div className="page-head">
        <h1>Anleitung</h1>
      </div>

      <p className="lead">
        <strong>dots Studio</strong> ist die Kommandozentrale deiner dots-App: Hier pflegst du
        Events, und hier arbeitet der <strong>KI-Import-Agent</strong>, der Veranstaltungen aus
        Texten, Plakaten und Webseiten automatisch erkennt. Alles, was du hier veröffentlichst,
        erscheint sofort in der Handy-App.
      </p>

      <div className="flow">
        <span className="flow-step">Quelle (Text · Plakat · Website)</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step hot">KI liest &amp; extrahiert</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step">Kandidaten-Liste</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step">Du prüfst &amp; gibst frei</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step hot">Event in der App</span>
      </div>

      <h2>1. Starten &amp; Anmelden</h2>
      <ul>
        <li>
          <strong>Doppelklick auf „dots Studio"</strong> (Schreibtisch). Die App startet den
          lokalen Server und öffnet ein eigenes Fenster — beim allerersten Start kann das bis zu
          eine Minute dauern, danach geht es in Sekunden.
        </li>
        <li>
          Das <strong>Passwort</strong> steht in der Datei <code>apps/admin/.env.local</code>{' '}
          (Zeile <code>ADMIN_PASSWORD=…</code>). Nach dem Login bleibst du 7 Tage angemeldet.
        </li>
        <li>
          Läuft etwas schief, hilft das Protokoll: <code>~/Library/Logs/dots-studio.log</code>.
        </li>
      </ul>

      <h2>2. Wie der KI-Agent arbeitet</h2>
      <p>
        Der Agent nutzt <strong>Claude</strong> (Anthropic), um aus unstrukturiertem Input
        strukturierte Events zu machen: Titel, Datum/Uhrzeit, Location, Kategorie, Preis,
        Beschreibung. Dabei gilt:
      </p>
      <ul>
        <li>
          <strong>Nichts geht automatisch live.</strong> Die KI legt nur{' '}
          <em>Kandidaten</em> an — veröffentlicht wird erst, wenn du im Review freigibst.
        </li>
        <li>
          <strong>Datumsangaben</strong> („diesen Freitag", „SA 12.7.") löst die KI über einen
          eingebauten 14-Tage-Kalender auf statt selbst zu rechnen — das war früher die häufigste
          Fehlerquelle. Endet ein Event „23–05 Uhr", wird das Ende korrekt auf den Folgetag gelegt.
        </li>
        <li>
          <strong>Unsichere Angaben werden nicht geraten:</strong> Fehlt ein sicheres Datum, bleibt
          das Feld leer und der Kandidat bekommt eine Warnung — du ergänzt es im Review.
        </li>
        <li>
          <strong>Duplikate</strong> werden erkannt (gleicher Titel, Start ±12 h) und gar nicht
          erst doppelt eingereiht.
        </li>
        <li>
          <strong>Konfidenz:</strong> Jeder Kandidat hat einen Wert von 0–1. Hoch (grün) = Titel,
          Datum und Ort waren klar erkennbar. Niedrig (rot) = genau hinschauen.
        </li>
      </ul>
      <div className="callout">
        <strong>Modelle &amp; Kosten:</strong> Texte liest Claude Sonnet (≈ 1–3 Cent pro Import),
        Plakate/Fotos das stärkere Opus-Modell (≈ 3–8 Cent pro Bild). Jeder Quellen-Scan
        protokolliert seinen Token-Verbrauch und die ungefähren Kosten in den{' '}
        <strong>Läufen</strong> (Quellen-Seite) — so behältst du dein Guthaben im Blick.
      </div>

      <h2>3. Die drei Import-Wege</h2>
      <h3>a) Text einfügen</h3>
      <p>
        <strong>KI-Import → Text-Feld:</strong> Instagram-Caption, WhatsApp-Nachricht,
        Newsletter-Ausschnitt oder Webseiten-Text einfügen → „Extrahieren". Die KI erkennt auch
        mehrere Events in einem Text (z. B. ein Wochenprogramm).
      </p>
      <h3>b) Plakat / Flyer hochladen</h3>
      <p>
        <strong>KI-Import → Bild hochladen:</strong> Foto oder Screenshot eines Plakats (JPG/PNG)
        auswählen. Das Vision-Modell liest Datum, Ort, Acts und Preise direkt vom Bild. Das Bild
        selbst wird nicht gespeichert — nur die extrahierten Daten.
      </p>
      <h3>c) Quellen automatisch scannen</h3>
      <p>
        <strong>Quellen:</strong> Lege Webseiten an (Venue-Programmseiten, RSS-Feeds,
        iCal-Kalender). Der Agent lädt die Seite, nutzt bevorzugt strukturierte Daten (schema.org,
        iCal) und schickt sonst den Seitentext durch die KI:
      </p>
      <ul>
        <li>
          <strong>„Scannen"</strong> stößt einen Lauf sofort an. Die <strong>Frequenz</strong>{' '}
          (stündlich/täglich/wöchentlich) greift, wenn der Scan-Endpunkt regelmäßig aufgerufen wird
          — lokal einfach ab und zu auf „Scannen" klicken.
        </li>
        <li>
          Jeder Lauf landet mit Protokoll in den <strong>Läufen</strong>: gefundene Events,
          übersprungene Duplikate, Warnungen (z. B. „Seitentext gekürzt") und die Kosten-Zeile.
        </li>
      </ul>
      <div className="callout warn">
        <strong>Instagram:</strong> Direktes Auslesen von Instagram-Profilen ist rechtlich heikel
        und bewusst nicht eingebaut. Der Weg ist: Caption kopieren → Text-Import, oder Screenshot →
        Bild-Import. Das dauert Sekunden und ist sauber.
      </div>

      <h2>4. Kandidaten prüfen (Review)</h2>
      <ul>
        <li>
          <strong>KI-Import</strong> zeigt alle offenen Kandidaten mit Konfidenz-Pille, Warn-Tags
          und möglichem Duplikat-Hinweis.
        </li>
        <li>
          Im Detail siehst du links die <strong>extrahierten Felder</strong> (alle korrigierbar)
          und darunter den <strong>Original-Input</strong> zum Gegenlesen.
        </li>
        <li>
          <strong>Venue zuordnen:</strong> Wähle die passende Location aus der Liste — dann bekommt
          das Event automatisch Koordinaten und erscheint auf der Karte der App.
        </li>
        <li>
          <strong>Freigeben</strong> erzeugt ein Event im Status „zur Prüfung" — sichtbar in der
          Event-Liste, wo du es final <strong>veröffentlichst</strong>. <strong>Ablehnen</strong>{' '}
          verwirft den Kandidaten (mit optionaler Notiz).
        </li>
      </ul>

      <h2>5. Events verwalten</h2>
      <ul>
        <li>
          <strong>Events</strong> listet alles — von Hand angelegt oder per KI importiert. Status:
          Entwurf → zur Prüfung → veröffentlicht (nur Letzteres sehen App-Nutzer).
        </li>
        <li>
          <strong>+ Neues Event</strong> legt ein Event komplett manuell an; Bearbeiten öffnet
          dasselbe Formular.
        </li>
        <li>„Verstecken" nimmt ein Event aus der App, ohne es zu löschen.</li>
      </ul>

      <h2>6. Wenn etwas hakt</h2>
      <ul>
        <li>
          <strong>„KI-Extraktion nicht möglich":</strong> Der Anthropic-Schlüssel fehlt oder ist
          ungültig → <code>apps/admin/.env.local</code>, Zeile <code>ANTHROPIC_API_KEY</code>.
        </li>
        <li>
          <strong>Scan findet nichts:</strong> Ins Lauf-Protokoll schauen (Quellen → Läufe). Steht
          dort „Fetch fehlgeschlagen", blockt die Seite automatische Zugriffe — dann Text-Import
          nutzen.
        </li>
        <li>
          <strong>„Output abgeschnitten":</strong> Sehr lange Programme in zwei Teilen importieren.
        </li>
        <li>
          <strong>Falsches Datum trotz allem:</strong> Im Review korrigieren — und gern melden,
          welcher Text es war; der Prompt lässt sich gezielt nachschärfen.
        </li>
        <li>
          <strong>App-Fenster bleibt leer:</strong> Fenster schließen, „dots Studio" erneut
          doppelklicken. Notfalls Log prüfen: <code>~/Library/Logs/dots-studio.log</code>.
        </li>
      </ul>

      <h2>7. Sicherheit</h2>
      <ul>
        <li>
          Alle Schlüssel (<code>ANTHROPIC_API_KEY</code>, Supabase-Service-Key, Admin-Passwort)
          liegen <strong>nur lokal</strong> in <code>apps/admin/.env.local</code> — diese Datei
          wird nie auf GitHub hochgeladen.
        </li>
        <li>
          dots Studio läuft nur auf deinem Mac (<code>localhost</code>) und ist zusätzlich mit dem
          Admin-Passwort geschützt.
        </li>
        <li>
          Die KI behandelt Quellentexte strikt als Daten: Anweisungen, die jemand in einen
          Event-Text schmuggelt („ignoriere deine Regeln"), werden ignoriert.
        </li>
      </ul>
    </div>
  );
}
