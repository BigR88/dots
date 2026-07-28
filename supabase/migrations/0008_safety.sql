-- dots — Sicherheit im Social-Layer: Nutzer blockieren & melden (App-Store-
-- Pflicht für Apps mit User-Content, Apple-Guideline 1.2) sowie Härtung der
-- Freundschafts-Policies aus 0003.
--
-- Modell: Blockieren beendet die Verbindung sofort (Freundschaft wird
-- gelöscht) und verhindert jede neue Kontaktaufnahme (Anfrage + Nachricht) in
-- beide Richtungen. Nutzer-Meldungen landen in `user_reports` (NICHT `reports`
-- — die gibt es seit 0001 bereits für Event-Meldungen!) und werden nur mit der
-- Service-Role (dots Studio / Supabase-Dashboard) gelesen.

-- ── blocks ──────────────────────────────────────────────────────────────────
create table blocks (
  blocker_id  uuid not null references profiles(id) on delete cascade,
  blocked_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on blocks (blocked_id);

-- ── user_reports (Meldungen über Personen) ──────────────────────────────────
-- reported_id ist nullable + on delete set null: Meldungen überdauern die
-- Konto-Löschung anonymisiert (Missbrauchs-Prävention; so steht es auch in
-- der Datenschutzerklärung der App).
create table user_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references profiles(id) on delete set null,
  reported_id  uuid references profiles(id) on delete set null,
  reason       text not null check (char_length(reason) between 1 and 1000),
  created_at   timestamptz not null default now()
);
create index user_reports_reported_idx on user_reports (reported_id, created_at);

-- Helper: besteht (in irgendeiner Richtung) eine Blockierung zwischen a und b?
-- An den Aufrufer gebunden (a oder b muss auth.uid() sein), damit niemand per
-- RPC Blockierungen fremder Paare ausspähen kann; alle Policy-Aufrufe unten
-- übergeben ohnehin immer auth.uid() als einen der Parameter.
create or replace function is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() in (a, b) and exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

-- Blockieren als eine Aktion: Block-Zeile anlegen + bestehende Freundschaft/
-- Anfrage entfernen. SECURITY DEFINER, weil das friendships-Delete sonst an
-- der eigenen Policy scheitern könnte, wenn künftig Policies enger werden.
create or replace function block_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or target is null or target = auth.uid() then
    raise exception 'Ungültige Blockierung.';
  end if;
  insert into blocks (blocker_id, blocked_id)
    values (auth.uid(), target)
    on conflict do nothing;
  delete from friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = target)
       or (f.addressee_id = auth.uid() and f.requester_id = target);
end;
$$;

revoke execute on function block_user(uuid) from public, anon;
grant execute on function block_user(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table blocks       enable row level security;
alter table user_reports enable row level security;

-- Jeder sieht/verwaltet nur die eigenen Blockierungen.
create policy blocks_select on blocks for select using (auth.uid() = blocker_id);
create policy blocks_insert on blocks for insert with check (auth.uid() = blocker_id);
create policy blocks_delete on blocks for delete using (auth.uid() = blocker_id);

-- Meldungen: nur selbst einreichen; lesen kann sie ausschließlich die
-- Service-Role (keine select-Policy).
create policy user_reports_insert on user_reports for insert
  with check (
    auth.uid() = reporter_id
    and reported_id is not null
    and reporter_id <> reported_id
  );

-- ── Bestehende Policies verschärfen ─────────────────────────────────────────
-- Keine Freundschaftsanfragen an/zwischen blockierten Nutzern.
drop policy friendships_insert on friendships;
create policy friendships_insert on friendships for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and not is_blocked(requester_id, addressee_id)
  );

-- Härtung von 0003: Der alte WITH CHECK prüfte nur den Status — der Empfänger
-- einer Anfrage konnte per UPDATE die requester_id auf ein fremdes Opfer
-- umschreiben und sich so eine „Freundschaft" ohne dessen Zustimmung bauen.
-- Jetzt: WITH CHECK bindet den Empfänger, und Spaltenrechte erlauben Updates
-- nur noch auf status/responded_at (IDs sind damit unveränderlich).
drop policy friendships_respond on friendships;
create policy friendships_respond on friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status in ('accepted', 'blocked'));
revoke update on table friendships from authenticated, anon;
grant update (status, responded_at) on table friendships to authenticated;

-- Keine Nachrichten an/zwischen blockierten Nutzern (Blockieren löscht zwar
-- die Freundschaft, aber doppelt hält besser).
drop policy messages_insert on messages;
create policy messages_insert on messages for insert
  with check (
    auth.uid() = sender_id
    and are_friends(sender_id, recipient_id)
    and not is_blocked(sender_id, recipient_id)
  );

-- Nutzersuche: blockierte Nutzer (beide Richtungen) ausblenden.
-- Basis ist die Fassung aus 0005 (matcht Anzeigename ODER @username).
create or replace function search_users(q text)
returns table (id uuid, display_name text, username text)
language sql stable security definer set search_path = public as $$
  with needle as (select btrim(regexp_replace(q, '^@+', '')) as t)
  select p.id, p.display_name, p.username
  from profiles p, needle
  where auth.uid() is not null
    and p.id <> auth.uid()
    and char_length(needle.t) >= 2
    and (
      p.display_name ilike '%' || needle.t || '%'
      or p.username   ilike '%' || needle.t || '%'
    )
    and not exists (
      select 1 from friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = p.id)
         or (f.addressee_id = auth.uid() and f.requester_id = p.id)
    )
    and not is_blocked(auth.uid(), p.id)
  order by p.display_name
  limit 20;
$$;
