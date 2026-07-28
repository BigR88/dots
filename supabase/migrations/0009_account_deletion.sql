-- dots — Konto-Löschung in der App (App-Store-Pflicht, Apple-Guideline
-- 5.1.1(v): Apps mit Registrierung müssen das Konto in der App löschen können).
--
-- Die Funktion löscht den eigenen auth.users-Eintrag; alles Weitere räumen die
-- Fremdschlüssel-Kaskaden auf: profiles (on delete cascade auf auth.users) →
-- friendships, messages, event_attendance, blocks, … / event_clicks sowie
-- user_reports.reporter_id/reported_id werden auf null gesetzt (anonymisiert,
-- bleiben für Statistik bzw. Moderation erhalten).
--
-- SECURITY DEFINER funktioniert hier, weil Migrationen auf Supabase als
-- `postgres` laufen und diese Rolle auth.users löschen darf. Falls Supabase
-- das einschränken sollte, ist die Alternative eine Edge Function mit
-- Service-Role-Key, die supabase.auth.admin.deleteUser() aufruft.

create or replace function delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function delete_account() from public, anon;
grant execute on function delete_account() to authenticated;
