# dots → App Store: Fahrplan & Checkliste

Stand: 2026-07-19. Dieses Dokument beschreibt den Weg von hier bis zur
Veröffentlichung im App Store — was schon im Code vorbereitet ist, was einmalig
eingerichtet werden muss und was vor der Einreichung noch offen ist.

## Schon im Code vorbereitet ✅

- **`apps/mobile/app.json`**: `ios.bundleIdentifier` = `app.dots.frankfurt`,
  `buildNumber`, Version `1.0.0`, `ITSAppUsesNonExemptEncryption=false`
  (erspart die Export-Compliance-Frage bei jedem Upload), Foto-Berechtigungstext
  für den Profilbild-Picker.
  ⚠️ Die Bundle-ID ist **nach dem ersten Upload unveränderbar** — wer eine
  andere will, muss sie VOR dem ersten `eas build` ändern.
- **`apps/mobile/eas.json`**: Build-Profile (development/preview/production).
  Die Supabase-Variablen stehen hier explizit drin, weil die lokale `.env`
  gitignored ist und NICHT in EAS-Builds landet. Der Publishable-Key ist
  öffentlich, das ist unbedenklich.
- **Login-Gate**: Der Dev-Bypass `EXPO_PUBLIC_AUTH_DISABLED` greift nur noch in
  Dev-Builds (`__DEV__`) — ein Store-Build kann das Gate nie offen lassen.
- **Konto-Löschung** (Apple-Pflicht 5.1.1(v)): Einstellungen → „Konto löschen"
  mit Bestätigungs-Sheet; serverseitig RPC `delete_account()`
  (Migration `0009_account_deletion.sql`).
- **Melden & Blockieren** (Apple-Pflicht 1.2 bei Nutzer-Inhalten): Ellipsis-Menü
  im Chat und im Freundes-Profil; serverseitig `blocks`/`reports` + RPC
  `block_user()` (Migration `0008_safety.sql`). Blockieren entfernt die
  Freundschaft und verhindert neue Anfragen/Nachrichten in beide Richtungen.

## Einmalig nötig (nicht automatisierbar)

### 1. Supabase-Projekt aufwecken + Migrationen einspielen ⚠️ vor dem nächsten Test

**Das Projekt ist vermutlich pausiert** (Free-Tier pausiert nach ~1 Woche
Inaktivität; am 2026-07-19 war `nianjlblszfenfeixnqb.supabase.co` nicht
erreichbar — die App zeigt dann „Events konnten nicht geladen werden").
Im Dashboard → Project → „Restore" klicken. Für den Livebetrieb einplanen:
Pro-Plan oder regelmäßige Aktivität, sonst schläft die App-Datenbank ein.

Danach im SQL-Editor die drei neuen Dateien ausführen (in dieser Reihenfolge):

1. `supabase/migrations/0008_safety.sql` (Nutzer-Meldungen heißen
   `user_reports` — `reports` gehört seit 0001 den Event-Meldungen)
2. `supabase/migrations/0009_account_deletion.sql`
3. `supabase/migrations/0010_audit_fixes.sql`

(`setup_all.sql` enthält alle bereits — aber nur für frische Projekte komplett
ausführen, nicht auf der bestehenden Datenbank.)

### 2. Apple Developer Program (≈ 99 €/Jahr)

1. Auf https://developer.apple.com/programs/enroll/ mit einer Apple-ID
   anmelden (am besten eine, die dem Projekt gehört, z. B. die
   dots-Google-Mail als Apple-ID registrieren oder eine eigene anlegen).
2. Als Einzelperson („Individual") einschreiben — geht am schnellsten
   (1–2 Tage). Firmen-Accounts brauchen eine D-U-N-S-Nummer und dauern länger.
   Hinweis: Bei „Individual" erscheint der eigene Klarname als Anbieter im
   Store. Wenn das nicht gewünscht ist → Gewerbe/GbR + D-U-N-S einplanen.
3. Zahlung abschließen und warten, bis der Account aktiv ist.

### 3. EAS Build einrichten (baut die App in der Cloud, kein Xcode-Wissen nötig)

```bash
npm install -g eas-cli
cd apps/mobile
eas login                # Expo-Konto (kostenlos anlegen, falls keins da)
eas init                 # verknüpft das Projekt (schreibt projectId in app.json)
eas build -p ios --profile production
```

Beim ersten iOS-Build fragt EAS nach dem Apple-Developer-Login und legt
Zertifikate/Provisioning-Profile automatisch an (alles mit „Ja" beantworten).

### 4. TestFlight

```bash
eas submit -p ios --latest
```

Das lädt den Build zu App Store Connect hoch. Dort unter TestFlight →
interne Tester (bis 100, sofort verfügbar) euch selbst und Freunde einladen.
**Wichtigster Meilenstein: Die App zum ersten Mal nativ auf echten iPhones
testen** — Karte (WebView), Safe-Areas, Tastatur im Chat, Login-Flow inkl.
E-Mail-Bestätigung.

## Audit-Blocker (2026-07-19) — Stand nach Umsetzung

- [x] **Registrierung erfordert eine echte E-Mail** (umgesetzt 2026-07-19):
      Der Namens-Kurzweg („yannik" → yannik@dots.app) gilt nur noch beim
      ANMELDEN bestehender Konten; die Registrierung verlangt eine gültige
      E-Mail (der Bestätigungs-Link braucht ein echtes Postfach).
- [x] **Karten-Attribution** (umgesetzt): „© OpenStreetMap-Mitwirkende ·
      © CARTO" liegt jetzt dezent unten links auf der Karte (Web + Native,
      über der Safe-Area).
      ⚠️ Noch offen: CARTO-Basemaps-Nutzungsbedingungen für kommerzielle
      Apps prüfen (ggf. API-Key oder Alternative wie MapTiler/Protomaps).
- [ ] **Review-Demo-Konto**: Apple verlangt bei Login-Apps Zugangsdaten fürs
      Review (App Store Connect → App-Review-Informationen). Also: Migrationen
      einspielen, ein Konto `review@…` mit echtem Postfach registrieren,
      bestätigen und die Daten beim Einreichen hinterlegen.
- [x] **Gast-Modus** (umgesetzt): „Ohne Konto entdecken" auf dem Auth-Screen —
      Karte/Events gehen ohne Konto (Apple 5.1.1(ii)); Freunde- und Profil-Tab
      zeigen Gästen einen Anmelde-Hinweis; Einstellungen bieten „Anmelden oder
      registrieren" (führt zurück zum Gate).
- [x] **Rechtsseiten** (umgesetzt): `/legal/privacy`, `/legal/terms`,
      `/legal/imprint` in der App (Einstellungen → Rechtliches; Auth-Screen
      verlinkt Nutzungsregeln + Datenschutz im Footer). Der Web-Export legt
      sie auch auf GitHub Pages ab → Datenschutz-URL fürs Store-Listing:
      `https://bigr88.github.io/dots/legal/privacy`.
      ⚠️ Noch offen: Platzhalter (Name/Adresse) in
      `apps/mobile/src/lib/legal.ts` mit echten Angaben füllen und die
      Supabase-Region in der Datenschutzerklärung präzisieren.
- [x] **„Passwort vergessen"** (umgesetzt, OTP-Flow ohne Deep Links):
      Auth-Screen → „Passwort vergessen?" → E-Mail → 6-stelliger Code + neues
      Passwort (`verifyOtp` type `recovery` + `updateUser`).
      ⚠️ Einmalig nötig: Im Supabase-Dashboard → Authentication → Email
      Templates → „Reset Password" den Platzhalter `{{ .Token }}` in den
      Mail-Text aufnehmen (z. B. „Dein Code: {{ .Token }}"), sonst enthält
      die Mail nur einen Link statt des Codes. Den Flow einmal mit echtem
      Postfach durchtesten.

## Vor der Einreichung noch offen

- [x] **App-Icon & Splash** (2026-07-20): eigenes dots-Icon ersetzt die
      Expo-Template-Assets — drei weiße Punkte, diagonal aufsteigend, auf dem
      Marken-Verlauf (#6C5CFF→#7A6BFF). Erzeugt sind icon.png,
      android-icon-{background,foreground,monochrome}.png, splash-icon.png
      (jetzt auch auf iOS aktiv) und favicon.png; das unbenutzte
      `assets/expo.icon`-Bundle kann gelöscht werden. Es ist ein sauberer
      programmatischer Marken-Entwurf — ein späteres Designer-Icon ersetzt
      einfach dieselben sechs PNGs (Generator:
      Scratchpad `icons/render.js`, Motiv-Koordinaten dort).
- [ ] **Alter Web-Export in `docs/`**: committeter Stand vom 29.06. ohne die
      /legal-Seiten. Das aktuelle Deployment läuft über GitHub Actions —
      in den Repo-Settings prüfen, dass Pages-Source „GitHub Actions" ist
      (nicht „Deploy from branch /docs"), dann `docs/` löschen, sonst zeigt
      die Datenschutz-URL ins Leere.
- [ ] **Echte Events**: Beim Review zählt „Minimum Functionality" (4.2) — eine
      Event-App mit leerer Karte fällt durch. Frankfurt über das dots Studio
      (Ingestion-Agent) gut füllen und aktuell halten.
- [ ] **Datenschutzerklärung hosten** (Pflicht-URL im Listing). Kann als
      statische Seite mit auf GitHub Pages liegen. Inhalte: Supabase (Hosting,
      Auth, Daten in der EU-Region prüfen), Standortnutzung, Chat-Nachrichten,
      Konto-Löschung, Kontakt/Verantwortlicher (Impressum).
- [ ] **Auth-Flow komplett auf dem Gerät testen**: Registrieren →
      Bestätigungs-Mail → Anmelden → Konto löschen. Supabase-E-Mail-Templates
      (Absender, deutscher Text) im Dashboard anpassen.
- [x] **„Passwort vergessen"** — umgesetzt (siehe Audit-Abschnitt oben,
      Supabase-Mail-Template anpassen!).
- [ ] **Screenshots**: Pflicht ist ein Satz für 6,9″ (z. B. iPhone 17 Pro Max,
      1320×2868). Am einfachsten: TestFlight-Build auf dem größten
      Simulator/Gerät + echte Screens, gern mit Marketing-Rahmen.
- [ ] **Store-Texte**: Name („dots — Events in Frankfurt"), Untertitel,
      Beschreibung, Keywords, Support-URL (kann die GitHub-Pages-Seite sein).
- [ ] **App-Privacy-Angaben** in App Store Connect (ehrlich nach Fragebogen):
      E-Mail-Adresse & Name (Konto), Standort (App-Funktion, nicht getrackt),
      Nutzer-Inhalte (Nachrichten), keine Werbung/kein Tracking.
- [ ] **Altersfreigabe**-Fragebogen ausfüllen (Nightlife-Bezug → vermutlich
      17+; ergibt sich aus den Antworten).
- [ ] **Version/Build**: Version bleibt `1.0.0`; die Build-Nummer zählt EAS
      automatisch hoch (`appVersionSource: remote` + `autoIncrement`).

## Ablauf-Empfehlung

1. Apple-Konto beantragen (Wartezeit nutzen für 2.–4.)
2. Migrationen einspielen, Events füllen, Datenschutzseite bauen
3. EAS-Build → TestFlight → 1–2 Wochen echte Nutzung in Frankfurt
4. Feedback/Crashes fixen, Screenshots + Texte finalisieren
5. Einreichen. Erster Review dauert meist 1–3 Tage; eine Ablehnung im ersten
   Anlauf ist normal — Begründung lesen, nachbessern, erneut einreichen.
