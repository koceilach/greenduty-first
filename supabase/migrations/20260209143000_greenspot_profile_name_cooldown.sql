-- Adds name-change cooldown tracking for GreenSpot profiles.
-- Name changes are enforced in app/api/greenspot/profile/route.ts.

alter table if exists greenspot.greenspot_profiles
  add column if not exists name_last_changed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'marketplace_profiles'
  ) then
    alter table public.marketplace_profiles
      add column if not exists name_last_changed_at timestamptz;
  end if;
end $$;

create index if not exists idx_greenspot_profiles_name_last_changed
  on greenspot.greenspot_profiles(name_last_changed_at);

select pg_notify('pgrst', 'reload schema');
