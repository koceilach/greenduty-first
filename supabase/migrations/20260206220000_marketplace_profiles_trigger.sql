-- Marketplace profile auto-create on signup (dynamic, no manual IDs)

create or replace function public.handle_marketplace_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data->>'marketplace','') = 'true' then
    insert into public.marketplace_profiles (id, email, role)
    values (new.id, new.email, 'buyer')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_marketplace on auth.users;
create trigger on_auth_user_created_marketplace
after insert on auth.users
for each row execute function public.handle_marketplace_user();

-- Optional backfill for existing marketplace-tagged users
insert into public.marketplace_profiles (id, email, role)
select u.id, u.email, 'buyer'
from auth.users u
where coalesce(u.raw_user_meta_data->>'marketplace','') = 'true'
  and not exists (
    select 1 from public.marketplace_profiles p where p.id = u.id
  );

select pg_notify('pgrst', 'reload schema');
