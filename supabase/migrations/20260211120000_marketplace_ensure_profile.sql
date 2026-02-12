-- ═══════════════════════════════════════════════════════════════
-- GreenDuty Marketplace: RLS fix + helper functions
-- Fixes infinite recursion caused by self-referencing subqueries.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. SECURITY DEFINER helpers (bypass RLS) ────────────────

-- Returns true if the current user has role = 'admin' in marketplace_profiles
create or replace function public.is_marketplace_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.marketplace_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Returns the current user's marketplace role (used to prevent self-role-change)
create or replace function public.get_my_marketplace_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.marketplace_profiles where id = auth.uid();
$$;

-- Ensures a marketplace profile exists; bypasses RLS for creation
create or replace function public.ensure_marketplace_profile(
  p_email text default null,
  p_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_username text;
  v_role text;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  v_email := coalesce(p_email, (select email from auth.users where id = v_user_id));
  v_username := coalesce(p_username, split_part(coalesce(v_email, ''), '@', 1));
  if v_username = '' then v_username := 'user'; end if;

  if lower(v_email) = 'osgamer804@gmail.com' then
    v_role := 'admin';
  else
    v_role := 'buyer';
  end if;

  insert into public.marketplace_profiles (id, email, username, role)
  values (v_user_id, v_email, v_username, v_role)
  on conflict (id) do update
    set email = coalesce(excluded.email, marketplace_profiles.email),
        username = coalesce(
          case when marketplace_profiles.username is null or marketplace_profiles.username = ''
               then excluded.username
               else marketplace_profiles.username end,
          excluded.username
        ),
        role = case
          when lower(coalesce(excluded.email, marketplace_profiles.email)) = 'osgamer804@gmail.com'
          then 'admin'
          else marketplace_profiles.role
        end;

  select jsonb_build_object(
    'id', mp.id, 'email', mp.email, 'username', mp.username,
    'role', mp.role, 'bio', mp.bio, 'store_name', mp.store_name,
    'avatar_url', mp.avatar_url, 'location', mp.location,
    'store_latitude', mp.store_latitude, 'store_longitude', mp.store_longitude,
    'created_at', mp.created_at, 'updated_at', mp.updated_at
  )
  into v_result
  from public.marketplace_profiles mp
  where mp.id = v_user_id;

  return coalesce(v_result, jsonb_build_object('error', 'Profile not found'));
end;
$$;

-- ─── 2. Fix marketplace_profiles RLS policies ────────────────
-- Remove ALL self-referencing policies and recreate with helper functions.

-- SELECT: keep the simple "auth.uid() is not null" policy, drop the admin one (redundant & recursive)
drop policy if exists "Admins can read all marketplace profiles" on public.marketplace_profiles;

-- UPDATE: drop both old policies, recreate with helper functions
drop policy if exists "Users can update their marketplace profile" on public.marketplace_profiles;
drop policy if exists "Users can update their marketplace profile (no role)" on public.marketplace_profiles;
create policy "Users can update their marketplace profile (no role)"
  on public.marketplace_profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND role = public.get_my_marketplace_role()
  );

drop policy if exists "Admins can update all marketplace profiles" on public.marketplace_profiles;
create policy "Admins can update all marketplace profiles"
  on public.marketplace_profiles
  for update
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

-- DELETE: recreate with helper function
drop policy if exists "Admins can delete marketplace profiles" on public.marketplace_profiles;
create policy "Admins can delete marketplace profiles"
  on public.marketplace_profiles
  for delete
  using (public.is_marketplace_admin());

-- ─── 3. Fix marketplace_seller_applications RLS policies ─────

drop policy if exists "Admins can read all seller applications" on public.marketplace_seller_applications;
create policy "Admins can read all seller applications"
  on public.marketplace_seller_applications
  for select
  using (public.is_marketplace_admin());

drop policy if exists "Admins can update seller applications" on public.marketplace_seller_applications;
create policy "Admins can update seller applications"
  on public.marketplace_seller_applications
  for update
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

-- ─── 4. Fix marketplace_items admin policy ───────────────────

drop policy if exists "Admins can delete marketplace items" on public.marketplace_items;
create policy "Admins can delete marketplace items"
  on public.marketplace_items
  for delete
  using (public.is_marketplace_admin());

-- ─── 5. Fix marketplace_orders admin policies ────────────────

drop policy if exists "Admins can read all orders" on public.marketplace_orders;
create policy "Admins can read all orders"
  on public.marketplace_orders
  for select
  using (public.is_marketplace_admin());

drop policy if exists "Admins can update all orders" on public.marketplace_orders;
create policy "Admins can update all orders"
  on public.marketplace_orders
  for update
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

-- ─── 6. Data fixes ──────────────────────────────────────────

-- Fix admin role
update public.marketplace_profiles
  set role = 'admin'
  where id in (
    select u.id from auth.users u
    where lower(u.email) = 'osgamer804@gmail.com'
  );

-- Backfill null emails
update public.marketplace_profiles mp
  set email = u.email
  from auth.users u
  where mp.id = u.id
    and mp.email is null
    and u.email is not null;
