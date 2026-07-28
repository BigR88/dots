-- dots — Fixes aus dem Launch-Audit (2026-07-19) für bereits eingespielte
-- Migrationen (0003/0005). Beide Änderungen sind rückwärtskompatibel.

-- 0003: are_friends war per RPC für beliebige fremde Nutzer-Paare abfragbar
-- (SECURITY DEFINER + Default-EXECUTE). Jetzt an den Aufrufer gebunden — alle
-- Policy-Aufrufe übergeben ohnehin immer auth.uid() als einen der Parameter.
create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() in (a, b) and exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- 0005: username_available meldete ohne Session jeden vergebenen Namen als
-- frei, weil `p.id <> auth.uid()` bei auth.uid() IS NULL zu NULL auswertet
-- und damit jede Zeile herausfiltert. `is distinct from` behandelt NULL korrekt.
create or replace function username_available(candidate text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from profiles p
    where lower(p.username) = lower(btrim(candidate))
      and p.id is distinct from auth.uid()
  );
$$;
