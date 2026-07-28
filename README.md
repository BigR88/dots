# dots

Event-Discovery-App für Frankfurt am Main — Karte, Events, Freunde, Chat.
Monorepo (npm workspaces). Web-Demo: https://bigr88.github.io/dots

> Stand: Feature-komplettes MVP auf dem Weg in den App Store.
> Der Launch-Fahrplan mit allen offenen Schritten steht in [APPSTORE.md](APPSTORE.md),
> der Event-Import in [INGESTION.md](INGESTION.md).

## Struktur

```
apps/mobile        Expo-App (React Native, Expo Router): Karte (Leaflet/CARTO),
                   Events, Favoriten, Freunde + 1:1-Chat, Profil, Auth mit
                   Gast-Modus, Rechtsseiten (/legal/*)
apps/admin         dots Studio (Next.js): Event-Redaktion + KI-Import-Review
packages/shared    Geteilte Typen, Fixtures, Design-Tokens
supabase/          SQL-Migrationen 0001–0010 + seed.sql; setup_all.sql für
                   frische Projekte (NICHT auf bestehender DB ausführen)
docs/              Statischer Web-Export für GitHub Pages (veralteter Stand —
                   das aktuelle Deployment läuft über die GitHub Action
                   .github/workflows/deploy-pages.yml)
```

## Schnellstart (Mobile)

```bash
npm install
npm run mobile         # Expo Dev Server (iOS/Android/Web)
npm run mobile:web     # direkt im Browser
npm run typecheck      # TypeScript über alle Workspaces
```

Ohne konfiguriertes Supabase-Backend läuft die App im **Demo-Modus** gegen
lokale Fixtures (`packages/shared/src/fixtures.ts`) — ohne Login-Gate, mit
Beispiel-Events und Demo-Freunden.

## Supabase (Live-Modus)

`apps/mobile/.env` nach dem Muster von `.env.example` füllen — dann zieht die
App echte Daten und zeigt das Login-Gate (Dev-Bypass: `EXPO_PUBLIC_AUTH_DISABLED=1`,
greift nur in Dev-Builds). Migrationen werden im Supabase-SQL-Editor in
Nummern-Reihenfolge eingespielt; für komplett neue Projekte gibt es
`supabase/setup_all.sql`.

## App-Store-Release

Alles Weitere — EAS Build, TestFlight, Store-Listing, Rechtliches, offene
Blocker — steht in [APPSTORE.md](APPSTORE.md).
