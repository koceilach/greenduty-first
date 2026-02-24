-- ============================================================
-- Education moderation cockpit:
-- report workflow, sanctions, audit trail, admin RPC
-- ============================================================

alter table public.edu_post_reports
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists action_note text;

create table if not exists public.edu_post_report_audit (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.edu_post_reports(id) on delete cascade,
  post_id uuid not null references public.edu_posts(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  action text not null check (action in ('reviewed', 'dismissed', 'action_taken', 'sanction_applied')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.edu_user_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.edu_post_reports(id) on delete set null,
  sanction_type text not null check (sanction_type in ('warn', 'mute_education', 'suspend_education', 'ban_education')),
  reason text not null,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references auth.users(id),
  constraint edu_user_sanctions_window_check check (ends_at is null or ends_at > starts_at)
);

create index if not exists idx_edu_post_reports_status_reviewed
  on public.edu_post_reports (status, reviewed_at desc, created_at desc);

create index if not exists idx_edu_post_reports_post_status
  on public.edu_post_reports (post_id, status, created_at desc);

create index if not exists idx_edu_post_report_audit_report_created
  on public.edu_post_report_audit (report_id, created_at desc);

create index if not exists idx_edu_post_report_audit_actor_created
  on public.edu_post_report_audit (actor_id, created_at desc);

create index if not exists idx_edu_user_sanctions_user_active
  on public.edu_user_sanctions (user_id, active, starts_at desc);

create index if not exists idx_edu_user_sanctions_report
  on public.edu_user_sanctions (report_id, created_at desc);

alter table public.edu_post_reports enable row level security;
alter table public.edu_post_report_audit enable row level security;
alter table public.edu_user_sanctions enable row level security;

drop policy if exists "edu_post_reports: insert own" on public.edu_post_reports;
create policy "edu_post_reports: insert own"
  on public.edu_post_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "edu_post_reports: read own" on public.edu_post_reports;
create policy "edu_post_reports: read own"
  on public.edu_post_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "edu_post_reports: admin read all" on public.edu_post_reports;
create policy "edu_post_reports: admin read all"
  on public.edu_post_reports
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

drop policy if exists "edu_post_reports: admin update" on public.edu_post_reports;
create policy "edu_post_reports: admin update"
  on public.edu_post_reports
  for update
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists "edu_post_report_audit: admin read" on public.edu_post_report_audit;
create policy "edu_post_report_audit: admin read"
  on public.edu_post_report_audit
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

drop policy if exists "edu_post_report_audit: admin write" on public.edu_post_report_audit;
create policy "edu_post_report_audit: admin write"
  on public.edu_post_report_audit
  for insert
  to authenticated
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists "edu_user_sanctions: read own or admin" on public.edu_user_sanctions;
create policy "edu_user_sanctions: read own or admin"
  on public.edu_user_sanctions
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_platform_admin(auth.uid()));

drop policy if exists "edu_user_sanctions: admin insert" on public.edu_user_sanctions;
create policy "edu_user_sanctions: admin insert"
  on public.edu_user_sanctions
  for insert
  to authenticated
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists "edu_user_sanctions: admin update" on public.edu_user_sanctions;
create policy "edu_user_sanctions: admin update"
  on public.edu_user_sanctions
  for update
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists "edu_user_sanctions: admin delete" on public.edu_user_sanctions;
create policy "edu_user_sanctions: admin delete"
  on public.edu_user_sanctions
  for delete
  to authenticated
  using (public.is_platform_admin(auth.uid()));

create or replace function public.edu_is_sanctioned(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.edu_user_sanctions s
    where s.user_id = coalesce(p_user_id, auth.uid())
      and s.active = true
      and s.sanction_type in ('mute_education', 'suspend_education', 'ban_education')
      and s.starts_at <= now()
      and (s.ends_at is null or s.ends_at > now())
  );
$$;

revoke all on function public.edu_is_sanctioned(uuid) from public;
grant execute on function public.edu_is_sanctioned(uuid) to authenticated;

drop policy if exists "edu_posts: auth insert" on public.edu_posts;
drop policy if exists "edu_posts: auth insert own" on public.edu_posts;
create policy "edu_posts: auth insert own"
  on public.edu_posts
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not public.edu_is_sanctioned(auth.uid())
  );

drop policy if exists "edu_comments: auth insert" on public.edu_comments;
drop policy if exists "edu_comments: auth insert own" on public.edu_comments;
create policy "edu_comments: auth insert own"
  on public.edu_comments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not public.edu_is_sanctioned(auth.uid())
  );

do $$
begin
  if to_regclass('public.edu_reels') is not null then
    execute 'drop policy if exists "edu_reels: auth insert own" on public.edu_reels';
    execute '
      create policy "edu_reels: auth insert own"
      on public.edu_reels
      for insert
      to authenticated
      with check (
        auth.uid() = author_id
        and not public.edu_is_sanctioned(auth.uid())
      )';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.edu_reel_comments') is not null then
    execute 'drop policy if exists "edu_reel_comments: auth insert own" on public.edu_reel_comments';
    execute '
      create policy "edu_reel_comments: auth insert own"
      on public.edu_reel_comments
      for insert
      to authenticated
      with check (
        auth.uid() = user_id
        and not public.edu_is_sanctioned(auth.uid())
      )';
  end if;
end;
$$;

create or replace function public.edu_review_post_report(
  p_report_id uuid,
  p_action text,
  p_note text default null,
  p_apply_sanction boolean default false,
  p_sanction_type text default null,
  p_sanction_days integer default null
)
returns public.edu_post_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_report public.edu_post_reports%rowtype;
  v_now timestamptz := now();
  v_new_status text;
  v_previous_status text;
  v_post_owner uuid;
  v_sanction_type text;
  v_sanction_ends timestamptz;
  v_audit_note text;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_platform_admin(v_actor) then
    raise exception 'Admin only';
  end if;

  select *
    into v_report
  from public.edu_post_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found';
  end if;

  case lower(trim(coalesce(p_action, '')))
    when 'review', 'reviewed' then v_new_status := 'reviewed';
    when 'dismiss', 'dismissed' then v_new_status := 'dismissed';
    when 'take_action', 'action_taken', 'remove_post' then v_new_status := 'action_taken';
    else
      raise exception 'Unsupported moderation action: %', p_action;
  end case;

  if v_new_status = 'action_taken' then
    update public.edu_posts
    set status = 'archived',
        updated_at = now()
    where id = v_report.post_id
      and status <> 'archived';
  end if;

  v_previous_status := v_report.status;

  update public.edu_post_reports
  set
    status = v_new_status,
    reviewed_by = v_actor,
    reviewed_at = v_now,
    action_note = coalesce(nullif(trim(p_note), ''), action_note)
  where id = v_report.id
  returning *
  into v_report;

  insert into public.edu_post_report_audit (
    report_id,
    post_id,
    actor_id,
    from_status,
    to_status,
    action,
    note
  )
  values (
    v_report.id,
    v_report.post_id,
    v_actor,
    coalesce(v_previous_status, 'open'),
    v_new_status,
    v_new_status,
    nullif(trim(p_note), '')
  );

  if p_apply_sanction then
    v_sanction_type := lower(trim(coalesce(p_sanction_type, '')));
    if v_sanction_type not in ('warn', 'mute_education', 'suspend_education', 'ban_education') then
      raise exception 'Invalid sanction type: %', coalesce(p_sanction_type, '<null>');
    end if;

    select p.user_id
      into v_post_owner
    from public.edu_posts p
    where p.id = v_report.post_id;

    if v_post_owner is not null then
      if p_sanction_days is not null and p_sanction_days > 0 then
        v_sanction_ends := v_now + make_interval(days => p_sanction_days);
      else
        v_sanction_ends := null;
      end if;

      v_audit_note := coalesce(nullif(trim(p_note), ''), v_report.reason);

      insert into public.edu_user_sanctions (
        user_id,
        report_id,
        sanction_type,
        reason,
        active,
        starts_at,
        ends_at,
        created_by
      )
      values (
        v_post_owner,
        v_report.id,
        v_sanction_type,
        v_audit_note,
        true,
        v_now,
        v_sanction_ends,
        v_actor
      );

      insert into public.edu_post_report_audit (
        report_id,
        post_id,
        actor_id,
        from_status,
        to_status,
        action,
        note
      )
      values (
        v_report.id,
        v_report.post_id,
        v_actor,
        v_new_status,
        v_new_status,
        'sanction_applied',
        v_sanction_type || ': ' || coalesce(v_audit_note, '')
      );
    end if;
  end if;

  return v_report;
end;
$$;

grant execute on function public.edu_review_post_report(uuid, text, text, boolean, text, integer)
to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_post_report_audit'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_post_report_audit';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_user_sanctions'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_user_sanctions';
    end if;
  end if;
end;
$$;

select pg_notify('pgrst', 'reload schema');
