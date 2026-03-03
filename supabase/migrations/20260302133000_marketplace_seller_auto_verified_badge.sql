-- GreenDuty Marketplace: auto-verified badge for sellers
-- Any profile with role = seller always gets is_verified = true.

alter table if exists public.marketplace_profiles
  add column if not exists is_verified boolean not null default false;

create or replace function public.marketplace_sync_seller_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'seller' then
    new.is_verified := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_marketplace_profiles_seller_verified
  on public.marketplace_profiles;

create trigger trg_marketplace_profiles_seller_verified
before insert or update of role, is_verified
on public.marketplace_profiles
for each row
execute function public.marketplace_sync_seller_verification();

update public.marketplace_profiles
set is_verified = true
where role = 'seller'
  and coalesce(is_verified, false) = false;

select pg_notify('pgrst', 'reload schema');
