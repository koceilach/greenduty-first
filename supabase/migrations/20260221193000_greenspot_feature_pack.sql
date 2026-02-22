-- GreenSpot feature pack:
-- 1) Admin audit log + reasoned actions
-- 2) Report lifecycle states + actor/timestamp history
-- 3) Privacy-safe public feed + abuse controls
-- 4) Draft/retry-safe report dedupe (client_submission_id)
-- 5) In-app notifications (dedupe + read state)

-- ---------------------------------------------------------------------------
-- Admin audit log
-- ---------------------------------------------------------------------------
create table if not exists greenspot.admin_audit_log (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  target_id text not null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_greenspot_admin_audit_created
  on greenspot.admin_audit_log(created_at desc);
create index if not exists idx_greenspot_admin_audit_actor
  on greenspot.admin_audit_log(actor_user_id, created_at desc);
create index if not exists idx_greenspot_admin_audit_target
  on greenspot.admin_audit_log(target_type, target_id, created_at desc);

alter table greenspot.admin_audit_log enable row level security;

drop policy if exists "GreenSpot admin audit read admin" on greenspot.admin_audit_log;
drop policy if exists "GreenSpot admin audit read own actor" on greenspot.admin_audit_log;

create policy "GreenSpot admin audit read admin"
  on greenspot.admin_audit_log
  for select
  to authenticated
  using (greenspot.is_admin(auth.uid()));

create policy "GreenSpot admin audit read own actor"
  on greenspot.admin_audit_log
  for select
  to authenticated
  using (auth.uid() = actor_user_id);

grant select on greenspot.admin_audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications (dedupe + read state)
-- ---------------------------------------------------------------------------
create table if not exists greenspot.notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_greenspot_notifications_dedupe
  on greenspot.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_greenspot_notifications_user_created
  on greenspot.notifications(user_id, created_at desc);

alter table greenspot.notifications enable row level security;

drop policy if exists "GreenSpot notifications read own" on greenspot.notifications;
drop policy if exists "GreenSpot notifications update own" on greenspot.notifications;
drop policy if exists "GreenSpot notifications insert own" on greenspot.notifications;

create policy "GreenSpot notifications read own"
  on greenspot.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "GreenSpot notifications update own"
  on greenspot.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "GreenSpot notifications insert own"
  on greenspot.notifications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert, update on greenspot.notifications to authenticated;
grant usage, select on sequence greenspot.notifications_id_seq to authenticated;

create or replace function greenspot.enqueue_notification_internal(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_dedupe_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_id bigint;
begin
  if p_user_id is null then
    raise exception 'Notification target user is required.';
  end if;

  if trim(coalesce(p_type, '')) = '' then
    raise exception 'Notification type is required.';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'Notification title is required.';
  end if;

  insert into greenspot.notifications (
    user_id,
    type,
    title,
    body,
    dedupe_key,
    metadata,
    is_read,
    read_at,
    created_at
  )
  values (
    p_user_id,
    trim(p_type),
    trim(p_title),
    nullif(trim(coalesce(p_body, '')), ''),
    nullif(trim(coalesce(p_dedupe_key, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    false,
    null,
    now()
  )
  on conflict (user_id, dedupe_key)
  do update set
    type = excluded.type,
    title = excluded.title,
    body = excluded.body,
    metadata = excluded.metadata,
    is_read = false,
    read_at = null,
    created_at = now()
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'notification_id', v_id
  );
end;
$$;

revoke all on function greenspot.enqueue_notification_internal(uuid, text, text, text, text, jsonb) from public;

create or replace function greenspot.push_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_dedupe_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  if v_actor <> p_user_id and not greenspot.is_admin(v_actor) then
    raise exception 'Cannot create notifications for other users.';
  end if;

  return greenspot.enqueue_notification_internal(
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_dedupe_key,
    p_metadata
  );
end;
$$;

revoke all on function greenspot.push_notification(uuid, text, text, text, text, jsonb) from public;
grant execute on function greenspot.push_notification(uuid, text, text, text, text, jsonb) to authenticated;

create or replace function greenspot.mark_notification_read(
  p_notification_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  update greenspot.notifications
  set
    is_read = true,
    read_at = now()
  where id = p_notification_id
    and user_id = v_actor;

  if not found then
    raise exception 'Notification not found.';
  end if;

  return jsonb_build_object('ok', true, 'notification_id', p_notification_id);
end;
$$;

revoke all on function greenspot.mark_notification_read(bigint) from public;
grant execute on function greenspot.mark_notification_read(bigint) to authenticated;

create or replace function greenspot.mark_all_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
  v_count integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  update greenspot.notifications
  set
    is_read = true,
    read_at = now()
  where user_id = v_actor
    and is_read = false;

  get diagnostics v_count = row_count;

  return jsonb_build_object('ok', true, 'updated', v_count);
end;
$$;

revoke all on function greenspot.mark_all_notifications_read() from public;
grant execute on function greenspot.mark_all_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- Verification review reason
-- ---------------------------------------------------------------------------
alter table greenspot.verification_requests
  add column if not exists reviewed_reason text;

-- ---------------------------------------------------------------------------
-- Report lifecycle + action history
-- ---------------------------------------------------------------------------
alter table greenspot.greenspot_reports
  add column if not exists lifecycle_state text;
alter table greenspot.greenspot_reports
  add column if not exists reported_at timestamptz;
alter table greenspot.greenspot_reports
  add column if not exists reported_by uuid references auth.users(id) on delete set null;
alter table greenspot.greenspot_reports
  add column if not exists accepted_at timestamptz;
alter table greenspot.greenspot_reports
  add column if not exists accepted_by uuid references auth.users(id) on delete set null;
alter table greenspot.greenspot_reports
  add column if not exists in_progress_at timestamptz;
alter table greenspot.greenspot_reports
  add column if not exists in_progress_by uuid references auth.users(id) on delete set null;
alter table greenspot.greenspot_reports
  add column if not exists verified_at timestamptz;
alter table greenspot.greenspot_reports
  add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table greenspot.greenspot_reports
  add column if not exists completed_at timestamptz;
alter table greenspot.greenspot_reports
  add column if not exists completed_by uuid references auth.users(id) on delete set null;
alter table greenspot.greenspot_reports
  add column if not exists rejected_at timestamptz;
alter table greenspot.greenspot_reports
  add column if not exists rejected_by uuid references auth.users(id) on delete set null;
alter table greenspot.greenspot_reports
  add column if not exists rejected_reason text;
alter table greenspot.greenspot_reports
  add column if not exists client_submission_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'greenspot_reports_lifecycle_state_check'
  ) then
    alter table greenspot.greenspot_reports
      add constraint greenspot_reports_lifecycle_state_check
      check (
        lifecycle_state in (
          'reported',
          'accepted',
          'in_progress',
          'verified',
          'completed',
          'rejected',
          'archived'
        )
      );
  end if;
end $$;

update greenspot.greenspot_reports
set
  lifecycle_state = coalesce(nullif(lifecycle_state, ''), 'reported'),
  reported_at = coalesce(reported_at, created_at, now()),
  reported_by = coalesce(reported_by, user_id)
where true;

create index if not exists idx_greenspot_reports_lifecycle_state
  on greenspot.greenspot_reports(lifecycle_state);
create unique index if not exists idx_greenspot_reports_client_submission_id
  on greenspot.greenspot_reports(client_submission_id)
  where client_submission_id is not null;

create table if not exists greenspot.report_lifecycle_events (
  id bigserial primary key,
  report_id uuid not null references greenspot.greenspot_reports(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_state text,
  next_state text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_greenspot_report_events_report_created
  on greenspot.report_lifecycle_events(report_id, created_at desc);

alter table greenspot.report_lifecycle_events enable row level security;

drop policy if exists "GreenSpot report events read own or admin" on greenspot.report_lifecycle_events;
drop policy if exists "GreenSpot report events insert actor" on greenspot.report_lifecycle_events;

create policy "GreenSpot report events read own or admin"
  on greenspot.report_lifecycle_events
  for select
  to authenticated
  using (
    greenspot.is_admin(auth.uid())
    or actor_user_id = auth.uid()
    or exists (
      select 1
      from greenspot.greenspot_reports report
      where report.id = report_lifecycle_events.report_id
        and report.user_id = auth.uid()
    )
  );

create policy "GreenSpot report events insert actor"
  on greenspot.report_lifecycle_events
  for insert
  to authenticated
  with check (
    actor_user_id = auth.uid()
    and (
      greenspot.is_admin(auth.uid())
      or exists (
        select 1
        from greenspot.greenspot_reports report
        where report.id = report_lifecycle_events.report_id
          and report.user_id = auth.uid()
      )
      or exists (
        select 1
        from greenspot.greenspot_care_tasks task
        where task.greenspot_report_id = report_lifecycle_events.report_id
          and task.user_id = auth.uid()
      )
    )
  );

grant select, insert on greenspot.report_lifecycle_events to authenticated;

-- ---------------------------------------------------------------------------
-- Abuse controls
-- ---------------------------------------------------------------------------
create table if not exists greenspot.report_submission_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_greenspot_submission_usage_user_created
  on greenspot.report_submission_usage(user_id, created_at desc);

alter table greenspot.report_submission_usage enable row level security;

drop policy if exists "GreenSpot submission usage read own" on greenspot.report_submission_usage;
drop policy if exists "GreenSpot submission usage insert own" on greenspot.report_submission_usage;

create policy "GreenSpot submission usage read own"
  on greenspot.report_submission_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "GreenSpot submission usage insert own"
  on greenspot.report_submission_usage
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on greenspot.report_submission_usage to authenticated;
grant usage, select on sequence greenspot.report_submission_usage_id_seq to authenticated;

create or replace function greenspot.consume_report_submission_quota(
  p_per_10m integer default 5,
  p_per_day integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
  v_10m integer := 0;
  v_day integer := 0;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  delete from greenspot.report_submission_usage
  where created_at < v_now - interval '7 days';

  select count(*)::int into v_10m
  from greenspot.report_submission_usage
  where user_id = v_actor
    and created_at >= v_now - interval '10 minutes';

  select count(*)::int into v_day
  from greenspot.report_submission_usage
  where user_id = v_actor
    and created_at >= v_now - interval '1 day';

  if v_10m >= greatest(p_per_10m, 1) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'limit_10m',
      'retry_after_seconds', 600,
      'count_10m', v_10m,
      'count_day', v_day
    );
  end if;

  if v_day >= greatest(p_per_day, 1) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'limit_day',
      'retry_after_seconds', 3600,
      'count_10m', v_10m,
      'count_day', v_day
    );
  end if;

  insert into greenspot.report_submission_usage(user_id) values (v_actor);

  return jsonb_build_object(
    'ok', true,
    'count_10m', v_10m + 1,
    'count_day', v_day + 1
  );
end;
$$;

revoke all on function greenspot.consume_report_submission_quota(integer, integer) from public;
grant execute on function greenspot.consume_report_submission_quota(integer, integer) to authenticated;

create table if not exists greenspot.public_endpoint_usage (
  id bigserial primary key,
  endpoint_key text not null,
  client_fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_greenspot_public_endpoint_usage_key_fingerprint
  on greenspot.public_endpoint_usage(endpoint_key, client_fingerprint, created_at desc);

alter table greenspot.public_endpoint_usage enable row level security;

create or replace function greenspot.consume_public_endpoint_quota(
  p_endpoint text,
  p_fingerprint text,
  p_per_minute integer default 120,
  p_per_hour integer default 3000
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_endpoint text := trim(coalesce(p_endpoint, ''));
  v_fingerprint text := trim(coalesce(p_fingerprint, ''));
  v_minute integer := 0;
  v_hour integer := 0;
  v_now timestamptz := now();
begin
  if v_endpoint = '' then
    raise exception 'Endpoint key is required.';
  end if;

  if v_fingerprint = '' then
    raise exception 'Fingerprint is required.';
  end if;

  delete from greenspot.public_endpoint_usage
  where created_at < v_now - interval '2 days';

  select count(*)::int into v_minute
  from greenspot.public_endpoint_usage
  where endpoint_key = v_endpoint
    and client_fingerprint = v_fingerprint
    and created_at >= v_now - interval '1 minute';

  select count(*)::int into v_hour
  from greenspot.public_endpoint_usage
  where endpoint_key = v_endpoint
    and client_fingerprint = v_fingerprint
    and created_at >= v_now - interval '1 hour';

  if v_minute >= greatest(p_per_minute, 1) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'minute_limit',
      'retry_after_seconds', 60,
      'count_minute', v_minute,
      'count_hour', v_hour
    );
  end if;

  if v_hour >= greatest(p_per_hour, 1) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'hour_limit',
      'retry_after_seconds', 3600,
      'count_minute', v_minute,
      'count_hour', v_hour
    );
  end if;

  insert into greenspot.public_endpoint_usage(endpoint_key, client_fingerprint)
  values (v_endpoint, v_fingerprint);

  return jsonb_build_object(
    'ok', true,
    'count_minute', v_minute + 1,
    'count_hour', v_hour + 1
  );
end;
$$;

revoke all on function greenspot.consume_public_endpoint_quota(text, text, integer, integer) from public;
grant execute on function greenspot.consume_public_endpoint_quota(text, text, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin functions with reason + audit
-- ---------------------------------------------------------------------------
create or replace function greenspot.admin_review_verification_request_with_reason(
  p_request_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_admin uuid := auth.uid();
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_request greenspot.verification_requests%rowtype;
  v_next_tier text;
begin
  if v_admin is null then
    raise exception 'Authentication required for admin action.';
  end if;

  if not greenspot.is_admin(v_admin) then
    raise exception 'Admin privileges required.';
  end if;

  if v_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select *
    into v_request
  from greenspot.verification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Verification request not found.';
  end if;

  update greenspot.verification_requests
  set
    status = v_decision,
    reviewed_at = now(),
    reviewed_by = v_admin,
    reviewed_reason = v_reason,
    updated_at = now()
  where id = v_request.id;

  v_next_tier := case
    when v_decision = 'approved' and lower(coalesce(v_request.type, 'student')) = 'researcher'
      then 'impact'
    when v_decision = 'approved'
      then 'pro'
    else null
  end;

  update greenspot.greenspot_profiles
  set
    verification_status = v_decision,
    verification_type = v_request.type,
    account_tier = case
      when v_next_tier is not null then v_next_tier
      else greenspot.greenspot_profiles.account_tier
    end,
    updated_at = now()
  where id = v_request.user_id;

  if not found then
    raise exception 'Applicant profile not found.';
  end if;

  insert into greenspot.admin_audit_log (
    actor_user_id,
    target_user_id,
    target_type,
    target_id,
    action,
    reason,
    metadata
  )
  values (
    v_admin,
    v_request.user_id,
    'verification_request',
    v_request.id::text,
    'verification.' || v_decision,
    v_reason,
    jsonb_build_object(
      'type', v_request.type,
      'status', v_decision,
      'account_tier', v_next_tier
    )
  );

  perform greenspot.enqueue_notification_internal(
    v_request.user_id,
    'verification.' || v_decision,
    case
      when v_decision = 'approved' then 'Verification approved'
      else 'Verification update'
    end,
    case
      when v_decision = 'approved'
        then 'Your GreenSpot verification request has been approved.'
      else coalesce(v_reason, 'Your GreenSpot verification request has been reviewed.')
    end,
    'verification:' || v_request.id::text || ':' || v_decision,
    jsonb_build_object(
      'request_id', v_request.id,
      'decision', v_decision,
      'reviewed_by', v_admin
    )
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request.id,
    'user_id', v_request.user_id,
    'decision', v_decision,
    'reason', v_reason,
    'account_tier', coalesce(v_next_tier, null)
  );
end;
$$;

revoke all on function greenspot.admin_review_verification_request_with_reason(uuid, text, text) from public;
grant execute on function greenspot.admin_review_verification_request_with_reason(uuid, text, text) to authenticated;

create or replace function greenspot.admin_review_verification_request(
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
begin
  return greenspot.admin_review_verification_request_with_reason(
    p_request_id,
    p_decision,
    null
  );
end;
$$;

revoke all on function greenspot.admin_review_verification_request(uuid, text) from public;
grant execute on function greenspot.admin_review_verification_request(uuid, text) to authenticated;

create or replace function greenspot.admin_set_profile_role_with_reason(
  p_user_id uuid,
  p_role text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_admin uuid := auth.uid();
  v_role text := lower(trim(coalesce(p_role, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_admin is null then
    raise exception 'Authentication required for admin action.';
  end if;

  if not greenspot.is_admin(v_admin) then
    raise exception 'Admin privileges required.';
  end if;

  if v_role not in ('member', 'admin') then
    raise exception 'Role must be member or admin.';
  end if;

  update greenspot.greenspot_profiles
  set
    role = v_role,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  insert into greenspot.admin_audit_log (
    actor_user_id,
    target_user_id,
    target_type,
    target_id,
    action,
    reason,
    metadata
  )
  values (
    v_admin,
    p_user_id,
    'profile',
    p_user_id::text,
    'profile.role_set',
    v_reason,
    jsonb_build_object('role', v_role)
  );

  perform greenspot.enqueue_notification_internal(
    p_user_id,
    'profile.role',
    'Profile role updated',
    'An administrator updated your GreenSpot role to ' || v_role || '.',
    'profile:role:' || p_user_id::text || ':' || v_role,
    jsonb_build_object('role', v_role, 'updated_by', v_admin)
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'role', v_role,
    'reason', v_reason
  );
end;
$$;

revoke all on function greenspot.admin_set_profile_role_with_reason(uuid, text, text) from public;
grant execute on function greenspot.admin_set_profile_role_with_reason(uuid, text, text) to authenticated;

create or replace function greenspot.admin_set_profile_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
begin
  return greenspot.admin_set_profile_role_with_reason(
    p_user_id,
    p_role,
    null
  );
end;
$$;

revoke all on function greenspot.admin_set_profile_role(uuid, text) from public;
grant execute on function greenspot.admin_set_profile_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Replace acceptance function with lifecycle + history + notifications
-- ---------------------------------------------------------------------------
create or replace function greenspot.accept_report_transactional(
  p_report_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
  v_report greenspot.greenspot_reports%rowtype;
  v_profile greenspot.greenspot_profiles%rowtype;
  v_claim greenspot.greenspot_report_claims%rowtype;
  v_display_name text;
  v_status text;
  v_existing_task_count integer := 0;
  v_created_tasks integer := 0;
  v_plant_name text;
  v_previous_state text;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  select *
    into v_report
  from greenspot.greenspot_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found.';
  end if;

  if v_report.user_id = v_actor then
    raise exception 'You cannot accept your own report.';
  end if;

  v_previous_state := coalesce(v_report.lifecycle_state, 'reported');

  select *
    into v_profile
  from greenspot.greenspot_profiles
  where id = v_actor;

  v_display_name := coalesce(
    nullif(trim(v_profile.full_name), ''),
    nullif(trim(v_profile.username), ''),
    nullif(split_part(coalesce(v_profile.email, ''), '@', 1), ''),
    'Community Member'
  );

  insert into greenspot.greenspot_report_claims (
    report_id,
    accepted_by_user_id,
    accepted_by_name
  )
  values (
    p_report_id,
    v_actor,
    v_display_name
  )
  on conflict (report_id) do nothing;

  select *
    into v_claim
  from greenspot.greenspot_report_claims
  where report_id = p_report_id;

  if not found then
    raise exception 'Unable to claim report.';
  end if;

  if v_claim.accepted_by_user_id <> v_actor then
    raise exception 'This report has already been accepted by %.', coalesce(v_claim.accepted_by_name, 'another user');
  end if;

  v_status := 'Accepted by ' || coalesce(nullif(trim(v_claim.accepted_by_name), ''), v_display_name);

  select count(*)::int
    into v_existing_task_count
  from greenspot.greenspot_care_tasks
  where user_id = v_actor
    and greenspot_report_id = p_report_id;

  if v_existing_task_count = 0 then
    v_plant_name := regexp_replace(
      coalesce(v_report.location_name, v_report.area, 'Community Spot'),
      '\\s*\\(-?\\d{1,3}(?:\\.\\d+)?,\\s*-?\\d{1,3}(?:\\.\\d+)?\\)\\s*$',
      '',
      'g'
    );

    if trim(coalesce(v_plant_name, '')) = '' then
      v_plant_name := 'Community Spot';
    end if;

    insert into greenspot.greenspot_care_tasks (
      user_id,
      greenspot_report_id,
      plant_name,
      task_type,
      due_at,
      description,
      tips,
      status
    )
    values
      (
        v_actor,
        p_report_id,
        v_plant_name,
        'watering',
        now() + interval '1 day',
        'Water the area to support new planting growth.',
        'Keep soil moist and avoid overwatering.',
        'not_done'
      ),
      (
        v_actor,
        p_report_id,
        v_plant_name,
        'watering',
        now() + interval '4 days',
        'Perform follow-up watering and inspect moisture levels.',
        'Check 5-7cm soil depth before watering again.',
        'not_done'
      ),
      (
        v_actor,
        p_report_id,
        v_plant_name,
        'seasonal_care',
        now() + interval '8 days',
        'Inspect plant health and clear nearby waste.',
        'Remove debris and verify mulch coverage.',
        'not_done'
      ),
      (
        v_actor,
        p_report_id,
        v_plant_name,
        'pruning',
        now() + interval '14 days',
        'Light maintenance pruning for healthy structure.',
        'Use sanitized tools and remove damaged branches only.',
        'not_done'
      );

    v_created_tasks := 4;
  end if;

  if lower(coalesce(v_report.status, '')) <> lower(v_status)
     or coalesce(v_report.lifecycle_state, 'reported') <> 'accepted' then
    update greenspot.greenspot_reports
    set
      status = v_status,
      verified_count = coalesce(verified_count, 0) + 1,
      lifecycle_state = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      accepted_by = coalesce(accepted_by, v_actor),
      in_progress_at = coalesce(in_progress_at, now()),
      in_progress_by = coalesce(in_progress_by, v_actor),
      updated_at = now()
    where id = p_report_id;
  end if;

  if v_previous_state <> 'accepted' then
    insert into greenspot.report_lifecycle_events (
      report_id,
      actor_user_id,
      action,
      previous_state,
      next_state,
      metadata
    )
    values (
      p_report_id,
      v_actor,
      'report.accepted',
      v_previous_state,
      'accepted',
      jsonb_build_object(
        'accepted_by_name', coalesce(v_claim.accepted_by_name, v_display_name),
        'created_tasks', v_created_tasks
      )
    );
  end if;

  if v_created_tasks > 0 then
    perform greenspot.enqueue_notification_internal(
      v_actor,
      'care.tasks.created',
      'Care tasks scheduled',
      'We created your GreenSpot care plan for this accepted report.',
      'care:tasks:' || p_report_id::text || ':' || v_actor::text,
      jsonb_build_object('report_id', p_report_id, 'created_tasks', v_created_tasks)
    );
  end if;

  if v_report.user_id is not null and v_report.user_id <> v_actor then
    perform greenspot.enqueue_notification_internal(
      v_report.user_id,
      'report.accepted',
      'Your report was accepted',
      coalesce(v_claim.accepted_by_name, v_display_name) || ' accepted your report and started a care plan.',
      'report:accepted:' || p_report_id::text,
      jsonb_build_object(
        'report_id', p_report_id,
        'accepted_by_user_id', v_actor,
        'accepted_by_name', coalesce(v_claim.accepted_by_name, v_display_name)
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'report_id', p_report_id,
    'accepted_by', coalesce(v_claim.accepted_by_name, v_display_name),
    'accepted_by_user_id', v_actor,
    'accepted_at', coalesce(v_report.accepted_at, now()),
    'lifecycle_state', 'accepted',
    'status', v_status,
    'created_tasks', v_created_tasks
  );
end;
$$;

revoke all on function greenspot.accept_report_transactional(uuid) from public;
grant execute on function greenspot.accept_report_transactional(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
