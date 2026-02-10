-- GreenDuty Marketplace RBAC + Tables
-- Safe to run multiple times (uses IF NOT EXISTS guards where possible)

-- Profiles: add role column for RBAC
alter table if exists public.profiles
  add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'seller'));
  end if;
end$$;

-- Marketplace items
create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price_dzd numeric(10, 2) not null,
  image_url text,
  stock_quantity integer not null default 0,
  category text,
  plant_type text,
  wilaya text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Marketplace orders (buyer history + seller view)
create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.marketplace_items(id) on delete set null,
  quantity integer not null default 1,
  total_price_dzd numeric(10, 2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists marketplace_items_seller_id_idx
  on public.marketplace_items (seller_id);
create index if not exists marketplace_items_category_idx
  on public.marketplace_items (category);
create index if not exists marketplace_items_plant_type_idx
  on public.marketplace_items (plant_type);
create index if not exists marketplace_items_wilaya_idx
  on public.marketplace_items (wilaya);
create index if not exists marketplace_items_price_idx
  on public.marketplace_items (price_dzd);
create index if not exists marketplace_items_created_idx
  on public.marketplace_items (created_at desc);

create index if not exists marketplace_orders_buyer_id_idx
  on public.marketplace_orders (buyer_id);
create index if not exists marketplace_orders_item_id_idx
  on public.marketplace_orders (item_id);

-- RLS
alter table public.marketplace_items enable row level security;
alter table public.marketplace_orders enable row level security;

-- Marketplace items policies
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_items' and policyname='Marketplace items are readable'
  ) then
    create policy "Marketplace items are readable"
      on public.marketplace_items
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_items' and policyname='Sellers can insert their items'
  ) then
    create policy "Sellers can insert their items"
      on public.marketplace_items
      for insert
      with check (
        auth.uid() = seller_id
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'seller'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_items' and policyname='Sellers can update their items'
  ) then
    create policy "Sellers can update their items"
      on public.marketplace_items
      for update
      using (auth.uid() = seller_id)
      with check (auth.uid() = seller_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_items' and policyname='Sellers can delete their items'
  ) then
    create policy "Sellers can delete their items"
      on public.marketplace_items
      for delete
      using (auth.uid() = seller_id);
  end if;
end$$;

-- Marketplace orders policies
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_orders' and policyname='Buyers can read their orders'
  ) then
    create policy "Buyers can read their orders"
      on public.marketplace_orders
      for select
      using (auth.uid() = buyer_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_orders' and policyname='Sellers can read orders for their items'
  ) then
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
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_orders' and policyname='Buyers can place orders'
  ) then
    create policy "Buyers can place orders"
      on public.marketplace_orders
      for insert
      with check (auth.uid() = buyer_id);
  end if;
end$$;
