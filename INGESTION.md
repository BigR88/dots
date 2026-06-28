# dots — Event Ingestion System

KI-gestütztes Einlesen von Events aus mehreren Quellen → Review-Queue → Freigabe → App.
Rechtskonform: **kein Instagram-Scraper**, kein Login/Proxy/Captcha-Umgehen. Instagram nur
über halbautomatischen Flyer-/Screenshot-Upload (oder später offizielle API).

## Architektur

```
 Quelle (event_sources)                         Manuell
   │ Website / RSS / iCal / API                   │ Text einfügen / Plakat-Upload
   ▼                                               ▼
 Fetcher (apps/admin/src/lib/importer/fetchers)   ingest()
   • JSON-LD schema.org/Event ─┐ strukturiert (kein LLM)
   • iCal (.ics) ──────────────┘
   • RSS / sichtbarer HTML-Text ─► Claude-Extraktion (extract.ts, Tool-Use emit_events)
   • Plakat (Bild) ────────────────► Claude Vision
   ▼
 zod-Validierung gegen extractedEventSchema (packages/shared/src/extraction.ts)
   ▼
 Duplikat-/Venue-Matching (RPCs find_duplicate_events / match_venue, pg_trgm)
   ▼
 imported_event_candidates (status = pending)   ← Review-Queue
   ▼   Admin: /candidates  (prüfen, korrigieren, freigeben/ablehnen/Duplikat)
 promote_candidate(id, overrides)  →  events (status = pending_review)
   ▼   Admin: / (veröffentlichen)  →  status = published
 Mobile-App (liest nur status = 'published')
```

Jeder Quellen-Scan wird in **`event_ingestion_runs`** protokolliert; Flyer-Uploads in
**`event_uploads`**. Alle Admin-Daten sind RLS-geschützt (nur Admin/Editor bzw. Service-Role).

## Datenbank (Migration `supabase/migrations/0007_event_ingestion.sql`)

Additiv — bestehende Spalten werden **nicht** umbenannt/entfernt (App bleibt unberührt):
- `events`: + `confidence_score`, `duplicate_of`, `raw_extracted_text`, `source_kind`,
  `source_name`, `venue_name`, `short_description`, `price_text`, `image_url`, `city`,
  `timezone`, `missing_fields`, `warnings`.
- `event_sources`: + `active`, `check_frequency`, `last_checked_at`, `notes`, `updated_at`.
- `imported_event_candidates`: + `source_kind`, `source_name`, `warnings`.
- Neu: `event_ingestion_runs`, `event_uploads`.
- `promote_candidate(uuid, jsonb)` neu (ISO-Datum, Venue-/Kategorie-Match, Preis-Ableitung).

Ausführen: Supabase-Dashboard → SQL Editor → Inhalt von `0007_event_ingestion.sql`
(oder das aggregierte `supabase/setup_all.sql`) ausführen.

## Eine neue Quelle hinzufügen

1. Admin starten: `npm run -w @dots/admin dev` → http://localhost:3001
2. **Quellen** → „+ Quelle hinzufügen":
   - **Name**: z. B. „Tanzhaus West Programm"
   - **Typ**: `Website` (deckt JSON-LD/iCal/RSS automatisch ab), oder explizit `RSS-Feed` / `iCal (.ics)` / `API`.
   - **URL**: die öffentliche Programm-/Feed-URL, z. B. `https://tanzhaus-west.de/programm`.
   - **Scan-Frequenz**: `manuell` (nur per Button) oder `täglich`/`wöchentlich`/`stündlich` (für Cron).
3. **Scannen** klicken → der Fetcher lädt die Seite (robots.txt-treu), bevorzugt strukturierte
   Daten, sonst Seitentext → KI. Treffer landen unter **KI-Import** (`/candidates`) als `pending`.
4. Kandidat **prüfen → Freigeben** → Event entsteht als „zur Prüfung" → unter **Events** veröffentlichen.

Für Instagram: **KI-Import** → „Plakat hochladen" (Story-Screenshot/Flyer) oder „Text einfügen" (Caption).

## Automatischer Scan (Cron)

Endpunkt: `POST /api/cron/scan` mit Header `Authorization: Bearer $CRON_SECRET`.
Scannt alle **aktiven** Quellen, deren `check_frequency` fällig ist.

```bash
curl -X POST https://<admin-host>/api/cron/scan -H "Authorization: Bearer $CRON_SECRET"
```

Auslösbar von: Vercel Cron, GitHub Actions, n8n/Make, system-cron, oder Supabase
`pg_cron` + `pg_net`. Ohne gesetztes `CRON_SECRET` ist der Endpunkt deaktiviert (503).

## Setup / Environment (`apps/admin/.env.local`)

| Variable | Zweck | Pflicht |
|---|---|---|
| `ADMIN_PASSWORD` | Login-Gate fürs Admin (sonst alles 503) | **ja** |
| `ANTHROPIC_API_KEY` | KI-Extraktion (Text Sonnet 4.6 / Bild Opus 4.8) | ja (für KI) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Live-DB (sonst Demo-JSON) | für Live |
| `CRON_SECRET` | schützt `/api/cron/scan` | für Cron |
| `ADMIN_SESSION_SECRET` | Signatur des Session-Cookies (Default: Passwort) | optional |
| `DOTS_IMPORT_TEXT_MODEL` / `DOTS_IMPORT_VISION_MODEL` | Modell-Override | optional |
| `TICKETMASTER_API_KEY` | (geplant) Ticketing-Adapter | optional |

## Offene TODOs

- [ ] **`ADMIN_PASSWORD`** in `apps/admin/.env.local` setzen — sonst ist das Admin gesperrt (503).
- [ ] **`ANTHROPIC_API_KEY`** in `apps/admin/.env.local` setzen (sonst schlägt die Extraktion fehl).
- [ ] **Migration `0007`** im Supabase-SQL-Editor ausführen.
- [x] **Admin-Authentifizierung**: Passwort-Gate via `middleware.ts` + HMAC-Cookie schützt alle
      Seiten **und** Server-Actions. Login `/login`, Logout-Button oben. Für mehrere Redakteur:innen
      später auf echte Supabase-Accounts (`is_admin()`) umstellen.
- [ ] **`CRON_SECRET`** setzen + Cron-Trigger einrichten, wenn automatische Scans gewünscht.
- [ ] **Privater Storage-Bucket** für Flyer-Bilder, falls die Originaldatei aufbewahrt werden soll
      (aktuell wird nur Text/Extraktion gespeichert, kein Bild → kein Rehosting).
- [ ] **Ticketmaster Discovery API**-Adapter (kostenloser Key) als saubere Konzert-Quelle.
- [ ] **Instagram `business_discovery`**-Adapter (Meta-App + App-Review) — optional, nur bei Bedarf.

## Rechtliches Betriebsmuster

- Nur **Fakten** speichern; `description` paraphrasieren (nie Caption 1:1).
- **Keine fremden Bilder/Flyer rehosten** — nur `source_url` verlinken.
- robots.txt + Rate-Limits respektieren, eigener User-Agent, kein Link-Crawling.
- **Menschliches Review Pflicht** (kein Auto-Publish); unsicheres Datum ⇒ `needs_review`.
- Vor Launch anwaltliche Prüfung (DSGVO Art. 14, Venue-Opt-out).
