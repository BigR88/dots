-- dots — Social-Layer: Freundschaften, Chat, Event-Zusagen, Trend-Ranking.
-- Baut auf 0001 (profiles, events) und 0002 (RLS-Basis) auf.

-- ── Enums ───────────────────────────────────────────────────────────────────
create type friendship_status as enum ('pending', 'accepted', 'blocked');

-- ── friendships ─────────────────────────────────────────────────────────────
-- Eine Zeile pro Freundschaft; requester stellt die Anfrage, addressee nimmt an.
create table friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  addressee_id  uuid not null references profiles(id) on delete cascade,
  status        friendship_status not null default 'pending',
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
-- Pro Personenpaar nur eine Freundschaft, egal wer angefragt hat.
create unique index friendships_pair_uniq
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on friendships (addressee_id, status);

-- Helper: sind zwei Nutzer (angenommen) befreundet?
create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- ── messages (1:1-Chat) ─────────────────────────────────────────────────────
create table messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references profiles(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  check (sender_id <> recipient_id)
);
create index messages_thread_idx on messages (sender_id, recipient_id, created_at);
create index messages_recipient_idx on messages (recipient_id, read_at);

-- ── event_attendance ("Bin dabei") ──────────────────────────────────────────
create table event_attendance (
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendance_user_idx on event_attendance (user_id, created_at);

-- ── event_clicks (Detail-Aufrufe für das Trend-Signal) ──────────────────────
create table event_clicks (
  id          bigint generated always as identity primary key,
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null, -- anonym erlaubt
  created_at  timestamptz not null default now()
);
create index event_clicks_event_idx on event_clicks (event_id, created_at);

-- ── Trend-Ranking ───────────────────────────────────────────────────────────
-- Zusagen zählen stark, Klicks schwach; nur die letzten 7 Tage fließen ein.
create or replace view event_trending as
select
  e.id as event_id,
  coalesce(att.cnt, 0)                          as attendees,
  coalesce(clk.cnt, 0)                          as clicks_7d,
  coalesce(att.cnt, 0) * 5 + coalesce(clk.cnt, 0) as trend_score
from events e
left join lateral (
  select count(*) as cnt from event_attendance a where a.event_id = e.id
) att on true
left join lateral (
  select count(*) as cnt from event_clicks c
  where c.event_id = e.id and c.created_at > now() - interval '7 days'
) clk on true
where e.status = 'published';

-- Aggregierte Zähler öffentlich abrufbar (ohne Namen) — für Cards & Ranking.
create or replace function event_attendee_counts(event_ids uuid[])
returns table (event_id uuid, attendees bigint)
language sql stable security definer set search_path = public as $$
  select a.event_id, count(*)::bigint
  from event_attendance a
  where a.event_id = any (event_ids)
  group by a.event_id;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table friendships      enable row level security;
alter table messages         enable row level security;
alter table event_attendance enable row level security;
alter table event_clicks     enable row level security;

-- friendships: nur Beteiligte sehen/ändern sie.
create policy friendships_select on friendships for select
  using (auth.uid() in (requester_id, addressee_id));
create policy friendships_insert on friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');
create policy friendships_respond on friendships for update
  using (auth.uid() = addressee_id)            -- nur der Empfänger nimmt an/blockt
  with check (status in ('accepted', 'blocked'));
create policy friendships_delete on friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

-- messages: nur Sender/Empfänger lesen; senden nur an angenommene Freunde.
create policy messages_select on messages for select
  using (auth.uid() in (sender_id, recipient_id));
create policy messages_insert on messages for insert
  with check (auth.uid() = sender_id and are_friends(sender_id, recipient_id));
create policy messages_mark_read on messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- event_attendance: eigene Zusage verwalten; sichtbar sind eigene + die von
-- Freunden (Zähler laufen über event_attendee_counts, ohne Namen).
create policy attendance_select on event_attendance for select
  using (auth.uid() = user_id or are_friends(auth.uid(), user_id));
create policy attendance_insert on event_attendance for insert
  with check (auth.uid() = user_id);
create policy attendance_delete on event_attendance for delete
  using (auth.uid() = user_id);

-- event_clicks: jeder darf Klicks loggen (auch anonym), niemand liest roh.
create policy clicks_insert on event_clicks for insert
  with check (user_id is null or user_id = auth.uid());

-- Realtime für den Chat (in Supabase: Publication ergänzen).
alter publication supabase_realtime add table messages;
