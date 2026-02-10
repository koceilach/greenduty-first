-- GreenDuty Marketplace Buyer Lists (Saved + Cart)
-- Safe to run multiple times (uses IF NOT EXISTS guards where possible)

create table if not exists public.marketplace_saved_items (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_cart_items (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketplace_saved_items_unique_idx
  on public.marketplace_saved_items (buyer_id, item_id);
create unique index if not exists marketplace_cart_items_unique_idx
  on public.marketplace_cart_items (buyer_id, item_id);

create index if not exists marketplace_saved_items_buyer_id_idx
  on public.marketplace_saved_items (buyer_id);
create index if not exists marketplace_cart_items_buyer_id_idx
  on public.marketplace_cart_items (buyer_id);

alter table public.marketplace_saved_items enable row level security;
alter table public.marketplace_cart_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_saved_items' and policyname='Buyers can read saved items'
  ) then
    create policy "Buyers can read saved items"
      on public.marketplace_saved_items
      for select
      using (auth.uid() = buyer_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_saved_items' and policyname='Buyers can save items'
  ) then
    create policy "Buyers can save items"
      on public.marketplace_saved_items
      for insert
      with check (auth.uid() = buyer_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_saved_items' and policyname='Buyers can remove saved items'
  ) then
    create policy "Buyers can remove saved items"
      on public.marketplace_saved_items
      for delete
      using (auth.uid() = buyer_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_cart_items' and policyname='Buyers can read cart items'
  ) then
    create policy "Buyers can read cart items"
      on public.marketplace_cart_items
      for select
      using (auth.uid() = buyer_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_cart_items' and policyname='Buyers can add to cart'
  ) then
    create policy "Buyers can add to cart"
      on public.marketplace_cart_items
      for insert
      with check (auth.uid() = buyer_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_cart_items' and policyname='Buyers can update cart'
  ) then
    create policy "Buyers can update cart"
      on public.marketplace_cart_items
      for update
      using (auth.uid() = buyer_id)
      with check (auth.uid() = buyer_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='marketplace_cart_items' and policyname='Buyers can remove from cart'
  ) then
    create policy "Buyers can remove from cart"
      on public.marketplace_cart_items
      for delete
      using (auth.uid() = buyer_id);
  end if;
end$$;
