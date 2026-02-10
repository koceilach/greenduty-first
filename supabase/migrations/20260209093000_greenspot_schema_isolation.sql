-- GreenSpot dedicated schema, tables, policies, and storage buckets.
-- Idempotent migration to isolate GreenSpot data from public schema.

create schema if not exists greenspot;

grant usage on schema greenspot to anon, authenticated, service_role;

create or replace function greenspot.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists greenspot.greenspot_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  role text not null default 'member',
  account_tier text not null default 'basic',
  verification_status text not null default 'unverified',
  verification_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table greenspot.greenspot_profiles
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists role text not null default 'member',
  add column if not exists account_tier text not null default 'basic',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_type text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'greenspot_profiles_role_check'
  ) then
    alter table greenspot.greenspot_profiles
      add constraint greenspot_profiles_role_check
      check (role in ('member', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'greenspot_profiles_account_tier_check'
  ) then
    alter table greenspot.greenspot_profiles
      add constraint greenspot_profiles_account_tier_check
      check (account_tier in ('basic', 'pro', 'impact'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'greenspot_profiles_verification_status_check'
  ) then
    alter table greenspot.greenspot_profiles
      add constraint greenspot_profiles_verification_status_check
      check (verification_status in ('unverified', 'pending', 'approved', 'rejected'));
  end if;
end $$;

create or replace function greenspot.is_admin(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = greenspot, public
as $$
  select exists (
    select 1
    from greenspot.greenspot_profiles profile
    where profile.id = target_user
      and profile.role = 'admin'
  );
$$;

revoke all on function greenspot.is_admin(uuid) from public;
grant execute on function greenspot.is_admin(uuid) to authenticated, service_role;

create table if not exists greenspot.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  status text not null default 'pending',
  document_url text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table greenspot.verification_requests
  add column if not exists user_id uuid,
  add column if not exists type text,
  add column if not exists status text not null default 'pending',
  add column if not exists document_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'verification_requests_status_check'
  ) then
    alter table greenspot.verification_requests
      add constraint verification_requests_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists greenspot.greenspot_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area text not null default 'Unknown area',
  location_name text not null default 'Unknown location',
  category text not null default 'General',
  waste_type text,
  region text,
  access_level text not null default 'Public',
  description text not null default '',
  notes text,
  lat double precision,
  lng double precision,
  photos text[] not null default '{}',
  image_url text,
  user_name text,
  user_avatar text,
  verified_count integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table greenspot.greenspot_reports
  add column if not exists user_id uuid,
  add column if not exists area text not null default 'Unknown area',
  add column if not exists location_name text not null default 'Unknown location',
  add column if not exists category text not null default 'General',
  add column if not exists waste_type text,
  add column if not exists region text,
  add column if not exists access_level text not null default 'Public',
  add column if not exists description text not null default '',
  add column if not exists notes text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists photos text[] not null default '{}',
  add column if not exists image_url text,
  add column if not exists user_name text,
  add column if not exists user_avatar text,
  add column if not exists verified_count integer not null default 0,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'greenspot_reports_lat_lng_check'
  ) then
    alter table greenspot.greenspot_reports
      add constraint greenspot_reports_lat_lng_check
      check (
        (lat is null and lng is null)
        or (lat between -90 and 90 and lng between -180 and 180)
      );
  end if;
end $$;

create table if not exists greenspot.greenspot_care_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  greenspot_report_id uuid references greenspot.greenspot_reports(id) on delete set null,
  plant_name text not null,
  task_type text not null,
  due_at timestamptz not null,
  description text not null,
  tips text,
  status text not null default 'not_done',
  photo_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table greenspot.greenspot_care_tasks
  add column if not exists user_id uuid,
  add column if not exists greenspot_report_id uuid,
  add column if not exists plant_name text,
  add column if not exists task_type text,
  add column if not exists due_at timestamptz,
  add column if not exists description text,
  add column if not exists tips text,
  add column if not exists status text not null default 'not_done',
  add column if not exists photo_url text,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'greenspot_care_tasks_status_check'
  ) then
    alter table greenspot.greenspot_care_tasks
      add constraint greenspot_care_tasks_status_check
      check (status in ('not_done', 'done'));
  end if;
end $$;

create table if not exists greenspot.greenspot_health_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  greenspot_report_id uuid references greenspot.greenspot_reports(id) on delete set null,
  plant_name text not null,
  status text not null,
  issues text[] not null default '{}',
  actions text[] not null default '{}',
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table greenspot.greenspot_health_checks
  add column if not exists user_id uuid,
  add column if not exists greenspot_report_id uuid,
  add column if not exists plant_name text,
  add column if not exists status text,
  add column if not exists issues text[] not null default '{}',
  add column if not exists actions text[] not null default '{}',
  add column if not exists checked_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_greenspot_profiles_role
  on greenspot.greenspot_profiles(role);
create index if not exists idx_greenspot_reports_user_id
  on greenspot.greenspot_reports(user_id);
create index if not exists idx_greenspot_reports_created_at
  on greenspot.greenspot_reports(created_at desc);
create index if not exists idx_greenspot_reports_coordinates
  on greenspot.greenspot_reports(lat, lng);
create index if not exists idx_greenspot_care_tasks_user_due
  on greenspot.greenspot_care_tasks(user_id, due_at);
create index if not exists idx_greenspot_health_checks_user_checked
  on greenspot.greenspot_health_checks(user_id, checked_at desc);
create index if not exists idx_greenspot_verification_user
  on greenspot.verification_requests(user_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_greenspot_profiles_updated_at'
  ) then
    create trigger set_greenspot_profiles_updated_at
      before update on greenspot.greenspot_profiles
      for each row execute function greenspot.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_greenspot_reports_updated_at'
  ) then
    create trigger set_greenspot_reports_updated_at
      before update on greenspot.greenspot_reports
      for each row execute function greenspot.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_greenspot_care_tasks_updated_at'
  ) then
    create trigger set_greenspot_care_tasks_updated_at
      before update on greenspot.greenspot_care_tasks
      for each row execute function greenspot.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_verification_requests_updated_at'
  ) then
    create trigger set_verification_requests_updated_at
      before update on greenspot.verification_requests
      for each row execute function greenspot.set_updated_at();
  end if;
end $$;

alter table greenspot.greenspot_profiles enable row level security;
alter table greenspot.verification_requests enable row level security;
alter table greenspot.greenspot_reports enable row level security;
alter table greenspot.greenspot_care_tasks enable row level security;
alter table greenspot.greenspot_health_checks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_profiles'
      and policyname = 'GreenSpot profiles select own or admin'
  ) then
    create policy "GreenSpot profiles select own or admin"
      on greenspot.greenspot_profiles
      for select
      using (auth.uid() = id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_profiles'
      and policyname = 'GreenSpot profiles insert own'
  ) then
    create policy "GreenSpot profiles insert own"
      on greenspot.greenspot_profiles
      for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_profiles'
      and policyname = 'GreenSpot profiles update own or admin'
  ) then
    create policy "GreenSpot profiles update own or admin"
      on greenspot.greenspot_profiles
      for update
      using (auth.uid() = id or greenspot.is_admin(auth.uid()))
      with check (auth.uid() = id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'verification_requests'
      and policyname = 'GreenSpot verification select own or admin'
  ) then
    create policy "GreenSpot verification select own or admin"
      on greenspot.verification_requests
      for select
      using (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'verification_requests'
      and policyname = 'GreenSpot verification insert own'
  ) then
    create policy "GreenSpot verification insert own"
      on greenspot.verification_requests
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'verification_requests'
      and policyname = 'GreenSpot verification update admin'
  ) then
    create policy "GreenSpot verification update admin"
      on greenspot.verification_requests
      for update
      using (greenspot.is_admin(auth.uid()))
      with check (greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_reports'
      and policyname = 'GreenSpot reports select authenticated'
  ) then
    create policy "GreenSpot reports select authenticated"
      on greenspot.greenspot_reports
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_reports'
      and policyname = 'GreenSpot reports insert own'
  ) then
    create policy "GreenSpot reports insert own"
      on greenspot.greenspot_reports
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_reports'
      and policyname = 'GreenSpot reports update own or admin'
  ) then
    create policy "GreenSpot reports update own or admin"
      on greenspot.greenspot_reports
      for update
      using (auth.uid() = user_id or greenspot.is_admin(auth.uid()))
      with check (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_reports'
      and policyname = 'GreenSpot reports delete own or admin'
  ) then
    create policy "GreenSpot reports delete own or admin"
      on greenspot.greenspot_reports
      for delete
      using (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_care_tasks'
      and policyname = 'GreenSpot care read own or admin'
  ) then
    create policy "GreenSpot care read own or admin"
      on greenspot.greenspot_care_tasks
      for select
      using (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_care_tasks'
      and policyname = 'GreenSpot care insert own or admin'
  ) then
    create policy "GreenSpot care insert own or admin"
      on greenspot.greenspot_care_tasks
      for insert
      with check (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_care_tasks'
      and policyname = 'GreenSpot care update own or admin'
  ) then
    create policy "GreenSpot care update own or admin"
      on greenspot.greenspot_care_tasks
      for update
      using (auth.uid() = user_id or greenspot.is_admin(auth.uid()))
      with check (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_health_checks'
      and policyname = 'GreenSpot health read own or admin'
  ) then
    create policy "GreenSpot health read own or admin"
      on greenspot.greenspot_health_checks
      for select
      using (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_health_checks'
      and policyname = 'GreenSpot health insert own or admin'
  ) then
    create policy "GreenSpot health insert own or admin"
      on greenspot.greenspot_health_checks
      for insert
      with check (auth.uid() = user_id or greenspot.is_admin(auth.uid()));
  end if;
end $$;

grant select, insert, update, delete on all tables in schema greenspot to authenticated;
grant usage, select on all sequences in schema greenspot to authenticated;

insert into greenspot.greenspot_profiles (
  id,
  email,
  username,
  full_name,
  avatar_url,
  role,
  account_tier,
  verification_status,
  verification_type
)
select
  profile.id,
  profile.email,
  profile.username,
  profile.full_name,
  profile.avatar_url,
  case when profile.role = 'admin' then 'admin' else 'member' end,
  coalesce(profile.account_tier, 'basic'),
  coalesce(profile.verification_status, 'unverified'),
  profile.verification_type
from public.marketplace_profiles profile
where profile.id is not null
on conflict (id) do update
set
  email = coalesce(greenspot.greenspot_profiles.email, excluded.email),
  username = coalesce(greenspot.greenspot_profiles.username, excluded.username),
  full_name = coalesce(greenspot.greenspot_profiles.full_name, excluded.full_name),
  avatar_url = coalesce(greenspot.greenspot_profiles.avatar_url, excluded.avatar_url),
  role = case
    when greenspot.greenspot_profiles.role = 'admin' then 'admin'
    else excluded.role
  end;

do $$
declare
  verification_has_document_url boolean := false;
  verification_has_created_at boolean := false;
  verification_has_reviewed_at boolean := false;
  verification_document_url_expr text := 'null::text';
  verification_created_at_expr text := 'now()';
  verification_reviewed_at_expr text := 'null::timestamptz';
  verification_updated_at_expr text := 'now()';
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'verification_requests'
  ) then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'verification_requests'
        and column_name = 'document_url'
    )
    into verification_has_document_url;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'verification_requests'
        and column_name = 'created_at'
    )
    into verification_has_created_at;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'verification_requests'
        and column_name = 'reviewed_at'
    )
    into verification_has_reviewed_at;

    verification_document_url_expr := case
      when verification_has_document_url then 'request.document_url'
      else 'null::text'
    end;

    verification_created_at_expr := case
      when verification_has_created_at then 'coalesce(request.created_at, now())'
      else 'now()'
    end;

    verification_reviewed_at_expr := case
      when verification_has_reviewed_at then 'request.reviewed_at'
      else 'null::timestamptz'
    end;

    verification_updated_at_expr := case
      when verification_has_reviewed_at and verification_has_created_at
        then 'coalesce(request.reviewed_at, request.created_at, now())'
      when verification_has_reviewed_at
        then 'coalesce(request.reviewed_at, now())'
      when verification_has_created_at
        then 'coalesce(request.created_at, now())'
      else 'now()'
    end;

    execute format(
      $format$
      insert into greenspot.verification_requests (
        id,
        user_id,
        type,
        status,
        document_url,
        created_at,
        reviewed_at,
        updated_at
      )
      select
        request.id,
        request.user_id,
        request.type,
        coalesce(request.status, 'pending'),
        %s,
        %s,
        %s,
        %s
      from public.verification_requests request
      on conflict (id) do nothing
      $format$,
      verification_document_url_expr,
      verification_created_at_expr,
      verification_reviewed_at_expr,
      verification_updated_at_expr
    );
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'greenspot_reports'
  ) then
    insert into greenspot.greenspot_reports (
      id,
      user_id,
      area,
      location_name,
      category,
      waste_type,
      region,
      access_level,
      description,
      notes,
      photos,
      image_url,
      user_name,
      user_avatar,
      verified_count,
      status,
      created_at,
      updated_at
    )
    select
      report.id,
      report.user_id,
      coalesce(report.location_name, report.region, 'Community area'),
      coalesce(report.location_name, 'Unknown location'),
      coalesce(report.category, 'General'),
      coalesce(report.category, 'General'),
      report.region,
      coalesce(report.access_level, 'Public'),
      coalesce(report.description, ''),
      coalesce(report.description, ''),
      coalesce(report.photos, '{}'::text[]),
      case
        when cardinality(coalesce(report.photos, '{}'::text[])) > 0 then report.photos[1]
        else null
      end,
      coalesce(profile.full_name, profile.username, 'Community Member'),
      profile.avatar_url,
      0,
      coalesce(report.status, 'pending'),
      coalesce(report.created_at, now()),
      coalesce(report.created_at, now())
    from public.greenspot_reports report
    left join greenspot.greenspot_profiles profile
      on profile.id = report.user_id
    on conflict (id) do nothing;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'greenspot_care_tasks'
  ) then
    insert into greenspot.greenspot_care_tasks (
      id,
      user_id,
      greenspot_report_id,
      plant_name,
      task_type,
      due_at,
      description,
      tips,
      status,
      photo_url,
      completed_at,
      created_at,
      updated_at
    )
    select
      task.id,
      task.user_id,
      task.greenspot_report_id,
      task.plant_name,
      task.task_type,
      task.due_at,
      task.description,
      task.tips,
      coalesce(task.status, 'not_done'),
      task.photo_url,
      task.completed_at,
      coalesce(task.created_at, now()),
      coalesce(task.completed_at, task.created_at, now())
    from public.greenspot_care_tasks task
    on conflict (id) do nothing;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'greenspot_health_checks'
  ) then
    insert into greenspot.greenspot_health_checks (
      id,
      user_id,
      greenspot_report_id,
      plant_name,
      status,
      issues,
      actions,
      checked_at,
      created_at
    )
    select
      check_row.id,
      check_row.user_id,
      check_row.greenspot_report_id,
      check_row.plant_name,
      check_row.status,
      coalesce(check_row.issues, '{}'),
      coalesce(check_row.actions, '{}'),
      coalesce(check_row.checked_at, now()),
      coalesce(check_row.checked_at, now())
    from public.greenspot_health_checks check_row
    on conflict (id) do nothing;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values
  ('greenspot-uploads', 'greenspot-uploads', true),
  ('greenspot-care', 'greenspot-care', true),
  ('greenspot-verification', 'greenspot-verification', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot uploads public read'
  ) then
    create policy "GreenSpot uploads public read"
      on storage.objects
      for select
      to public
      using (bucket_id = 'greenspot-uploads');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot uploads insert own'
  ) then
    create policy "GreenSpot uploads insert own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'greenspot-uploads'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot uploads update own'
  ) then
    create policy "GreenSpot uploads update own"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'greenspot-uploads'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot uploads delete own'
  ) then
    create policy "GreenSpot uploads delete own"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'greenspot-uploads'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot care public read'
  ) then
    create policy "GreenSpot care public read"
      on storage.objects
      for select
      to public
      using (bucket_id = 'greenspot-care');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot care insert own'
  ) then
    create policy "GreenSpot care insert own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'greenspot-care'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot care update own'
  ) then
    create policy "GreenSpot care update own"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'greenspot-care'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot care delete own'
  ) then
    create policy "GreenSpot care delete own"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'greenspot-care'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot verification read own or admin'
  ) then
    create policy "GreenSpot verification read own or admin"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'greenspot-verification'
        and (
          (storage.foldername(name))[2] = auth.uid()::text
          or greenspot.is_admin(auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot verification insert own'
  ) then
    create policy "GreenSpot verification insert own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'greenspot-verification'
        and (storage.foldername(name))[2] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'GreenSpot verification delete own or admin'
  ) then
    create policy "GreenSpot verification delete own or admin"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'greenspot-verification'
        and (
          (storage.foldername(name))[2] = auth.uid()::text
          or greenspot.is_admin(auth.uid())
        )
      );
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
