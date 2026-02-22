-- GreenSpot hardening pack:
-- 1) RBAC lock for profile sensitive fields
-- 2) private verification documents with signed URL flow
-- 3) transactional RPCs for verification + report acceptance
-- 4) DB-backed AI chat quota helper

-- Ensure verification bucket is private. Access is controlled by storage policies.
update storage.buckets
set public = false
where id = 'greenspot-verification';

-- Split profile update policy into self/admin variants.
drop policy if exists "GreenSpot profiles update own or admin"
  on greenspot.greenspot_profiles;
drop policy if exists "GreenSpot profiles update own safe"
  on greenspot.greenspot_profiles;
drop policy if exists "GreenSpot profiles update admin"
  on greenspot.greenspot_profiles;

create policy "GreenSpot profiles update own safe"
  on greenspot.greenspot_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "GreenSpot profiles update admin"
  on greenspot.greenspot_profiles
  for update
  to authenticated
  using (greenspot.is_admin(auth.uid()))
  with check (greenspot.is_admin(auth.uid()));

-- Prevent non-admin users from mutating RBAC/verification fields directly.
create or replace function greenspot.guard_profile_sensitive_updates()
returns trigger
language plpgsql
set search_path = greenspot, public
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  -- SQL editor / migration / service-role executions often have no end-user JWT.
  if v_uid is null then
    if current_user in ('postgres', 'supabase_admin') or v_jwt_role = 'service_role' then
      return new;
    end if;
    raise exception 'Authentication required.';
  end if;

  if not greenspot.is_admin(v_uid) then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change profile role.';
    end if;

    if new.account_tier is distinct from old.account_tier then
      raise exception 'Only admins can change account tier.';
    end if;

    if new.verification_status is distinct from old.verification_status then
      raise exception 'Only admins can change verification status.';
    end if;

    if new.verification_type is distinct from old.verification_type then
      raise exception 'Only admins can change verification type.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_greenspot_profile_sensitive_updates
  on greenspot.greenspot_profiles;

create trigger guard_greenspot_profile_sensitive_updates
before update on greenspot.greenspot_profiles
for each row
execute function greenspot.guard_profile_sensitive_updates();

-- Track admin reviewer on verification requests.
alter table greenspot.verification_requests
  add column if not exists reviewed_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'greenspot_verification_requests_reviewed_by_fkey'
  ) then
    alter table greenspot.verification_requests
      add constraint greenspot_verification_requests_reviewed_by_fkey
      foreign key (reviewed_by)
      references auth.users(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_greenspot_verification_reviewed_by
  on greenspot.verification_requests(reviewed_by);

-- Transactional submit flow for verification request.
create or replace function greenspot.submit_verification_request(
  p_type text,
  p_document_path text
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
  v_request_id uuid;
  v_email text;
  v_fallback_name text;
  v_type text := lower(trim(coalesce(p_type, '')));
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  if v_type not in ('student', 'researcher') then
    raise exception 'Verification type must be student or researcher.';
  end if;

  if trim(coalesce(p_document_path, '')) = '' then
    raise exception 'Document path is required.';
  end if;

  select email
    into v_email
  from auth.users
  where id = v_actor;

  v_fallback_name := coalesce(nullif(split_part(coalesce(v_email, ''), '@', 1), ''), 'GreenSpot Member');

  insert into greenspot.greenspot_profiles (
    id,
    email,
    username,
    full_name,
    role,
    account_tier,
    verification_status,
    verification_type
  )
  values (
    v_actor,
    v_email,
    v_fallback_name,
    v_fallback_name,
    'member',
    'basic',
    'unverified',
    null
  )
  on conflict (id) do update
  set
    email = coalesce(greenspot.greenspot_profiles.email, excluded.email),
    username = coalesce(greenspot.greenspot_profiles.username, excluded.username),
    full_name = coalesce(greenspot.greenspot_profiles.full_name, excluded.full_name);

  insert into greenspot.verification_requests (
    user_id,
    type,
    status,
    document_url,
    created_at,
    updated_at,
    reviewed_at,
    reviewed_by
  )
  values (
    v_actor,
    v_type,
    'pending',
    trim(p_document_path),
    now(),
    now(),
    null,
    null
  )
  returning id into v_request_id;

  update greenspot.greenspot_profiles
  set
    verification_status = 'pending',
    verification_type = v_type,
    updated_at = now()
  where id = v_actor;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'status', 'pending',
    'verification_type', v_type
  );
end;
$$;

revoke all on function greenspot.submit_verification_request(text, text) from public;
grant execute on function greenspot.submit_verification_request(text, text) to authenticated;

-- Transactional admin review flow.
create or replace function greenspot.admin_review_verification_request(
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_admin uuid := auth.uid();
  v_decision text := lower(trim(coalesce(p_decision, '')));
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

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request.id,
    'user_id', v_request.user_id,
    'decision', v_decision,
    'account_tier', coalesce(v_next_tier, null)
  );
end;
$$;

revoke all on function greenspot.admin_review_verification_request(uuid, text) from public;
grant execute on function greenspot.admin_review_verification_request(uuid, text) to authenticated;

-- Server-only role mutation path.
create or replace function greenspot.admin_set_profile_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_admin uuid := auth.uid();
  v_role text := lower(trim(coalesce(p_role, '')));
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

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'role', v_role
  );
end;
$$;

revoke all on function greenspot.admin_set_profile_role(uuid, text) from public;
grant execute on function greenspot.admin_set_profile_role(uuid, text) to authenticated;

-- Transactional report acceptance flow.
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

  if lower(coalesce(v_report.status, '')) <> lower(v_status) then
    update greenspot.greenspot_reports
    set
      status = v_status,
      verified_count = coalesce(verified_count, 0) + 1,
      updated_at = now()
    where id = p_report_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'report_id', p_report_id,
    'accepted_by', coalesce(v_claim.accepted_by_name, v_display_name),
    'status', v_status,
    'created_tasks', v_created_tasks
  );
end;
$$;

revoke all on function greenspot.accept_report_transactional(uuid) from public;
grant execute on function greenspot.accept_report_transactional(uuid) to authenticated;

-- AI usage table + quota checker.
create table if not exists greenspot.greenspot_ai_chat_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_greenspot_ai_chat_usage_user_created
  on greenspot.greenspot_ai_chat_usage(user_id, created_at desc);

alter table greenspot.greenspot_ai_chat_usage enable row level security;

drop policy if exists "GreenSpot AI usage read own"
  on greenspot.greenspot_ai_chat_usage;
drop policy if exists "GreenSpot AI usage insert own"
  on greenspot.greenspot_ai_chat_usage;

create policy "GreenSpot AI usage read own"
  on greenspot.greenspot_ai_chat_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "GreenSpot AI usage insert own"
  on greenspot.greenspot_ai_chat_usage
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on greenspot.greenspot_ai_chat_usage to authenticated;
grant usage, select on sequence greenspot.greenspot_ai_chat_usage_id_seq to authenticated;

create or replace function greenspot.consume_ai_chat_quota(
  p_per_minute integer default 6,
  p_per_hour integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
  v_minute_count integer := 0;
  v_hour_count integer := 0;
  v_now timestamptz := now();
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  delete from greenspot.greenspot_ai_chat_usage
  where created_at < v_now - interval '7 days';

  select count(*)::int
    into v_minute_count
  from greenspot.greenspot_ai_chat_usage
  where user_id = v_actor
    and created_at >= v_now - interval '1 minute';

  select count(*)::int
    into v_hour_count
  from greenspot.greenspot_ai_chat_usage
  where user_id = v_actor
    and created_at >= v_now - interval '1 hour';

  if v_minute_count >= greatest(p_per_minute, 1) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'minute_limit',
      'retry_after_seconds', 60,
      'minute_count', v_minute_count,
      'hour_count', v_hour_count
    );
  end if;

  if v_hour_count >= greatest(p_per_hour, 1) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'hour_limit',
      'retry_after_seconds', 3600,
      'minute_count', v_minute_count,
      'hour_count', v_hour_count
    );
  end if;

  insert into greenspot.greenspot_ai_chat_usage (user_id)
  values (v_actor);

  return jsonb_build_object(
    'ok', true,
    'minute_count', v_minute_count + 1,
    'hour_count', v_hour_count + 1
  );
end;
$$;

revoke all on function greenspot.consume_ai_chat_quota(integer, integer) from public;
grant execute on function greenspot.consume_ai_chat_quota(integer, integer) to authenticated;

select pg_notify('pgrst', 'reload schema');
