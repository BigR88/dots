# dots

Event-Discovery-App für Frankfurt am Main. Monorepo (npm workspaces).

> Stand: Phase 0 + 1 (Scaffold + Lese-MVP). Siehe [docs/dots_MVP_Blueprint.md](docs/dots_MVP_Blueprint.md).

## Struktur

```
apps/mobile        Expo-App (React Native, Expo Router) — Liste, Detail, Karte-Platzhalter
packages/shared    Geteilte Typen, Zod-Schemas, Konstanten, Design-Tokens
supabase/          SQL-Migrationen (Schema §5) + seed.sql (Frankfurt-Events)
docs/              Blueprint
```

## Schnellstart (Mobile)

```bash
npm install
npm run mobile         # Expo Dev Server (iOS/Android/Web)
# oder direkt im Browser:
npm run mobile:web
```

Ohne konfiguriertes Supabase-Backend läuft die App gegen lokale **Fixtures**
(`apps/mobile/src/data/fixtures.ts`) — dieselben Events wie in `supabase/seed.sql`,
damit Liste + Detail sofort demonstrierbar sind.

## Supabase aktivieren (später)

1. Docker + Supabase CLI installieren **oder** ein Cloud-Projekt anlegen.
2. Migrationen anwenden:
   ```bash
   supabase start                       # lokal (Docker)
   supabase db reset                    # wendet migrations/ + seed.sql an
   ```
3. In `apps/mobile/.env` setzen:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   Sobald gesetzt, zieht die App echte Daten statt Fixtures.

## Status der Roadmap

- [x] Phase 0 — Monorepo, Expo-Skeleton, Schema, Design-Tokens
- [x] Phase 1 — Liste + Zeit-Tabs + Filter-Chips + Detail (Fixtures/Supabase)
- [ ] Phase 2 — Mapbox-Karte (Pins, Clustering, `events_near`)
- [ ] Phase 3 — Filter-Sheet, Sortierung, Suche
- [ ] Phase 4 — Next.js-Admin + Content-Workflow
- [ ] Phase 5 — Auth + Favoriten
- [ ] Phase 6 — KI-Import (FastAPI-Worker)
