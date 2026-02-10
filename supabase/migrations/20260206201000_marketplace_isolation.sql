-- GreenDuty Marketplace Isolation: dedicated marketplace_profiles + updated RBAC
-- Safe to run multiple times (uses IF NOT EXISTS and DROP IF EXISTS guards)

-- Marketplace profiles (isolated from public.profiles)
create table if not exists public.marketplace_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  role text not null default 'buyer',
  bio text,
  store_name text,
  avatar_url text,
  location text,
  store_latitude double precision,
  store_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_profiles_role_check'
  ) then
    alter table public.marketplace_profiles
      add constraint marketplace_profiles_role_check
      check (role in ('buyer', 'seller', 'admin'));
  end if;
end$$;

create unique index if not exists marketplace_profiles_email_idx
  on public.marketplace_profiles (lower(email))
  where email is not null;

create unique index if not exists marketplace_profiles_username_idx
  on public.marketplace_profiles (lower(username))
  where username is not null;

alter table public.marketplace_profiles enable row level security;

drop policy if exists "Marketplace profiles are readable" on public.marketplace_profiles;
create policy "Marketplace profiles are readable"
  on public.marketplace_profiles
  for select
  using (auth.uid() is not null);

drop policy if exists "Users can insert their marketplace profile" on public.marketplace_profiles;
create policy "Users can insert their marketplace profile"
  on public.marketplace_profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their marketplace profile" on public.marketplace_profiles;
create policy "Users can update their marketplace profile"
  on public.marketplace_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins can update all marketplace profiles" on public.marketplace_profiles;
create policy "Admins can update all marketplace profiles"
  on public.marketplace_profiles
  for update
  using (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  );

-- Backfill marketplace_profiles for existing marketplace activity
insert into public.marketplace_profiles (id, role)
select distinct seller_id, 'seller'
from public.marketplace_items
where seller_id is not null
on conflict (id) do update
  set role = 'seller'
  where public.marketplace_profiles.role = 'buyer';

insert into public.marketplace_profiles (id, role)
select distinct buyer_id, 'buyer'
from public.marketplace_orders
where buyer_id is not null
on conflict (id) do nothing;

insert into public.marketplace_profiles (id, role)
select distinct buyer_id, 'buyer'
from public.marketplace_saved_items
where buyer_id is not null
on conflict (id) do nothing;

insert into public.marketplace_profiles (id, role)
select distinct buyer_id, 'buyer'
from public.marketplace_cart_items
where buyer_id is not null
on conflict (id) do nothing;

-- Update foreign keys to marketplace_profiles
alter table public.marketplace_items
  drop constraint if exists marketplace_items_seller_id_fkey;
alter table public.marketplace_items
  add constraint marketplace_items_seller_id_fkey
  foreign key (seller_id) references public.marketplace_profiles(id) on delete cascade;

alter table public.marketplace_orders
  drop constraint if exists marketplace_orders_buyer_id_fkey;
alter table public.marketplace_orders
  add constraint marketplace_orders_buyer_id_fkey
  foreign key (buyer_id) references public.marketplace_profiles(id) on delete cascade;

alter table public.marketplace_saved_items
  drop constraint if exists marketplace_saved_items_buyer_id_fkey;
alter table public.marketplace_saved_items
  add constraint marketplace_saved_items_buyer_id_fkey
  foreign key (buyer_id) references public.marketplace_profiles(id) on delete cascade;

alter table public.marketplace_cart_items
  drop constraint if exists marketplace_cart_items_buyer_id_fkey;
alter table public.marketplace_cart_items
  add constraint marketplace_cart_items_buyer_id_fkey
  foreign key (buyer_id) references public.marketplace_profiles(id) on delete cascade;

-- Marketplace items policies (rebind to marketplace_profiles)
drop policy if exists "Marketplace items are readable" on public.marketplace_items;
create policy "Marketplace items are readable"
  on public.marketplace_items
  for select
  using (true);

drop policy if exists "Sellers can insert their items" on public.marketplace_items;
create policy "Sellers can insert their items"
  on public.marketplace_items
  for insert
  with check (
    auth.uid() = seller_id
    and exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'seller'
    )
  );

drop policy if exists "Sellers can update their items" on public.marketplace_items;
create policy "Sellers can update their items"
  on public.marketplace_items
  for update
  using (
    auth.uid() = seller_id
    and exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'seller'
    )
  )
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can delete their items" on public.marketplace_items;
create policy "Sellers can delete their items"
  on public.marketplace_items
  for delete
  using (
    auth.uid() = seller_id
    and exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'seller'
    )
  );

-- Marketplace orders policies
drop policy if exists "Buyers can read their orders" on public.marketplace_orders;
create policy "Buyers can read their orders"
  on public.marketplace_orders
  for select
  using (auth.uid() = buyer_id);

drop policy if exists "Sellers can read orders for their items" on public.marketplace_orders;
create policy "Sellers can read orders for their items"
  on public.marketplace_orders
  for select
  using (
    exists (
      select 1
      from public.marketplace_items i
      where i.id = item_id and i.seller_id = auth.uid()
    )
  );

drop policy if exists "Buyers can place orders" on public.marketplace_orders;
create policy "Buyers can place orders"
  on public.marketplace_orders
  for insert
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid()
    )
  );

drop policy if exists "Buyers can update escrow fields" on public.marketplace_orders;
create policy "Buyers can update escrow fields"
  on public.marketplace_orders
  for update
  using (
    auth.uid() = buyer_id
    and escrow_status in ('pending_receipt', 'funds_held', 'disputed')
  )
  with check (
    auth.uid() = buyer_id
    and escrow_status in ('pending_receipt', 'released_to_seller', 'disputed')
  );

drop policy if exists "Sellers can update shipping proof" on public.marketplace_orders;
create policy "Sellers can update shipping proof"
  on public.marketplace_orders
  for update
  using (
    exists (
      select 1
      from public.marketplace_items i
      where i.id = item_id and i.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.marketplace_items i
      where i.id = item_id and i.seller_id = auth.uid()
    )
  );

-- Admin policies for marketplace orders
drop policy if exists "Admins can read all orders" on public.marketplace_orders;
create policy "Admins can read all orders"
  on public.marketplace_orders
  for select
  using (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  );

drop policy if exists "Admins can update all orders" on public.marketplace_orders;
create policy "Admins can update all orders"
  on public.marketplace_orders
  for update
  using (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  );

-- Marketplace follow system
create table if not exists public.marketplace_follows (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  seller_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists marketplace_follows_unique_idx
  on public.marketplace_follows (buyer_id, seller_id);

alter table public.marketplace_follows enable row level security;

drop policy if exists "Marketplace follows are readable" on public.marketplace_follows;
create policy "Marketplace follows are readable"
  on public.marketplace_follows
  for select
  using (auth.uid() is not null);

drop policy if exists "Buyers can follow sellers" on public.marketplace_follows;
create policy "Buyers can follow sellers"
  on public.marketplace_follows
  for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "Buyers can unfollow sellers" on public.marketplace_follows;
create policy "Buyers can unfollow sellers"
  on public.marketplace_follows
  for delete
  using (auth.uid() = buyer_id);
