-- dots — Freunde: Nutzersuche + Freundes-/Anfragen-Übersicht.
--
-- Beide Funktionen sind SECURITY DEFINER, damit die `profiles`-Tabelle NICHT
-- breit geöffnet werden muss (profiles_self_read bleibt: nur eigenes Profil).
-- Sie geben gezielt nur id + display_name zurück. Baut auf 0003_social.sql
-- (friendships, are_friends) auf. Aktionen (anfragen/annehmen/entfernen) laufen
-- direkt über die friendships-Policies aus 0003.

-- Nutzer:innen nach Anzeigenamen suchen (min. 2 Zeichen). Blendet sich selbst
-- und bereits verbundene/angefragte Personen aus.
create or replace function search_users(q text)
returns table (id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name
  from profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and char_length(btrim(q)) >= 2
    and p.display_name ilike '%' || btrim(q) || '%'
    and not exists (
      select 1 from friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = p.id)
         or (f.addressee_id = auth.uid() and f.requester_id = p.id)
    )
  order by p.display_name
  limit 20;
$$;

-- Eigene Freundschaften (angenommen) + offene Anfragen, jeweils mit Name,
-- Richtung (friend/incoming/outgoing) und der friendship-ID für Aktionen.
create or replace function friend_overview()
returns table (
  friendship_id uuid,
  other_id      uuid,
  display_name  text,
  status        friendship_status,
  direction     text,
  created_at    timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as other_id,
    p.display_name,
    f.status,
    case
      when f.status = 'accepted'           then 'friend'
      when f.requester_id = auth.uid()     then 'outgoing'
      else 'incoming'
    end as direction,
    f.created_at
  from friendships f
  join profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
    and f.status in ('pending', 'accepted')
  order by f.status desc, p.display_name;
$$;

grant execute on function search_users(text)  to anon, authenticated;
grant execute on function friend_overview()   to anon, authenticated;
