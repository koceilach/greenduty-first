-- GreenDuty GreenSpot + Verification + Subscriptions (Marketplace profiles aligned)
-- Safe to run multiple times (uses IF NOT EXISTS guards where possible)

-- Extend marketplace_profiles for account tiers and verification
alter table if exists public.marketplace_profiles
  add column if not exists full_name text,
  add column if not exists account_tier text not null default 'basic',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketplace_profiles_account_tier_check'
  ) then
    alter table public.marketplace_profiles
      add constraint marketplace_profiles_account_tier_check
      check (account_tier in ('basic', 'pro', 'impact'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'marketplace_profiles_verification_status_check'
  ) then
    alter table public.marketplace_profiles
      add constraint marketplace_profiles_verification_status_check
      check (verification_status in ('unverified', 'pending', 'approved', 'rejected'));
  end if;
end$$;

-- Verification requests
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  type text not null,
  status text not null default 'pending',
  document_url text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.verification_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='verification_requests' and policyname='Verification read own'
  ) then
    create policy "Verification read own"
      on public.verification_requests
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='verification_requests' and policyname='Verification insert own'
  ) then
    create policy "Verification insert own"
      on public.verification_requests
      for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  plan_id text not null,
  status text not null default 'active',
  billing_interval text not null,
  currency text not null,
  amount numeric not null,
  provider text not null,
  auto_renew boolean default true,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='Subscriptions read own'
  ) then
    create policy "Subscriptions read own"
      on public.subscriptions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='Subscriptions insert own'
  ) then
    create policy "Subscriptions insert own"
      on public.subscriptions
      for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  currency text not null,
  amount numeric not null,
  status text not null default 'pending',
  provider_reference text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='Payments read own'
  ) then
    create policy "Payments read own"
      on public.payments
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='Payments insert own'
  ) then
    create policy "Payments insert own"
      on public.payments
      for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

-- GreenSpot reports
create table if not exists public.greenspot_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  location_name text not null,
  category text not null,
  region text not null,
  access_level text not null,
  description text not null,
  photos text[] default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.greenspot_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='greenspot_reports' and policyname='GreenSpot insert own'
  ) then
    create policy "GreenSpot insert own"
      on public.greenspot_reports
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='greenspot_reports' and policyname='GreenSpot read own'
  ) then
    create policy "GreenSpot read own"
      on public.greenspot_reports
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

-- GreenSpot care tasks
create table if not exists public.greenspot_care_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  greenspot_report_id uuid references public.greenspot_reports(id) on delete set null,
  plant_name text not null,
  task_type text not null,
  due_at timestamptz not null,
  description text not null,
  tips text,
  status text not null default 'not_done',
  photo_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.greenspot_care_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='greenspot_care_tasks' and policyname='Care tasks read own'
  ) then
    create policy "Care tasks read own"
      on public.greenspot_care_tasks
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='greenspot_care_tasks' and policyname='Care tasks insert own'
  ) then
    create policy "Care tasks insert own"
      on public.greenspot_care_tasks
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='greenspot_care_tasks' and policyname='Care tasks update own'
  ) then
    create policy "Care tasks update own"
      on public.greenspot_care_tasks
      for update
      using (auth.uid() = user_id);
  end if;
end$$;

-- GreenSpot health checks
create table if not exists public.greenspot_health_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  greenspot_report_id uuid references public.greenspot_reports(id) on delete set null,
  plant_name text not null,
  status text not null,
  issues text[] default '{}',
  actions text[] default '{}',
  checked_at timestamptz not null default now()
);

alter table public.greenspot_health_checks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='greenspot_health_checks' and policyname='Health checks read own'
  ) then
    create policy "Health checks read own"
      on public.greenspot_health_checks
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='greenspot_health_checks' and policyname='Health checks insert own'
  ) then
    create policy "Health checks insert own"
      on public.greenspot_health_checks
      for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

select pg_notify('pgrst', 'reload schema');
