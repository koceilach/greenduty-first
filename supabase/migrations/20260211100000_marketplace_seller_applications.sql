-- GreenDuty Marketplace: Seller Applications + Admin Controls
-- Prevents self-promotion. Buyers apply; admins approve.

-- ─── 1. Seller Applications Table ────────────────────────────

create table if not exists public.marketplace_seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  full_name text,
  store_name text not null,
  phone text,
  location text,
  bio text,
  id_file_url text,
  status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_seller_app_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists marketplace_seller_apps_user_idx
  on public.marketplace_seller_applications (user_id);

create index if not exists marketplace_seller_apps_status_idx
  on public.marketplace_seller_applications (status);

alter table public.marketplace_seller_applications enable row level security;

-- Users can read their own applications
drop policy if exists "Users can read own seller applications" on public.marketplace_seller_applications;
create policy "Users can read own seller applications"
  on public.marketplace_seller_applications
  for select
  using (auth.uid() = user_id);

-- Users can insert their own application
drop policy if exists "Users can submit seller applications" on public.marketplace_seller_applications;
create policy "Users can submit seller applications"
  on public.marketplace_seller_applications
  for insert
  with check (auth.uid() = user_id);

-- Admins can read all applications
drop policy if exists "Admins can read all seller applications" on public.marketplace_seller_applications;
create policy "Admins can read all seller applications"
  on public.marketplace_seller_applications
  for select
  using (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  );

-- Admins can update applications (approve/reject)
drop policy if exists "Admins can update seller applications" on public.marketplace_seller_applications;
create policy "Admins can update seller applications"
  on public.marketplace_seller_applications
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

-- ─── 2. Prevent Self-Role-Promotion ─────────────────────────
-- Drop the old permissive profile update policy and replace it
-- with one that blocks role changes.

drop policy if exists "Users can update their marketplace profile" on public.marketplace_profiles;

-- Users can update their profile EXCEPT the role field
drop policy if exists "Users can update their marketplace profile (no role)" on public.marketplace_profiles;
create policy "Users can update their marketplace profile (no role)"
  on public.marketplace_profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- prevent users from changing their own role
    AND role = (select mp.role from public.marketplace_profiles mp where mp.id = auth.uid())
  );

-- ─── 3. Admin: delete any marketplace item ───────────────────

drop policy if exists "Admins can delete marketplace items" on public.marketplace_items;
create policy "Admins can delete marketplace items"
  on public.marketplace_items
  for delete
  using (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  );

-- ─── 4. Admin: read all profiles ─────────────────────────────

drop policy if exists "Admins can read all marketplace profiles" on public.marketplace_profiles;
create policy "Admins can read all marketplace profiles"
  on public.marketplace_profiles
  for select
  using (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  );

-- ─── 5. Admin: delete marketplace profiles (ban) ─────────────

drop policy if exists "Admins can delete marketplace profiles" on public.marketplace_profiles;
create policy "Admins can delete marketplace profiles"
  on public.marketplace_profiles
  for delete
  using (
    exists (
      select 1 from public.marketplace_profiles mp
      where mp.id = auth.uid() and mp.role = 'admin'
    )
  );

-- ─── 6. Seed admin user ─────────────────────────────────────
-- Set osgamer804@gmail.com as admin.
-- This runs idempotently — updates the role if the profile exists.

update public.marketplace_profiles
  set role = 'admin'
  where lower(email) = 'osgamer804@gmail.com';
