-- GreenSpot lifecycle transition RPC:
-- Adds a single transactional path to move reports through lifecycle states
-- while writing timestamps/actors, lifecycle history, notifications, and admin audit rows.

create or replace function greenspot.transition_report_lifecycle(
  p_report_id uuid,
  p_next_state text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = greenspot, public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_admin boolean := false;
  v_report greenspot.greenspot_reports%rowtype;
  v_current_state text;
  v_next_state text := lower(trim(coalesce(p_next_state, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_actor_name text;
  v_status text;
  v_title text;
  v_body text;
  v_action text;
  v_transition_allowed boolean := false;
  v_permission_allowed boolean := false;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  if p_report_id is null then
    raise exception 'Report id is required.';
  end if;

  if v_next_state not in (
    'reported',
    'accepted',
    'in_progress',
    'verified',
    'completed',
    'rejected',
    'archived'
  ) then
    raise exception 'Invalid lifecycle state: %.', coalesce(p_next_state, '<null>');
  end if;

  select greenspot.is_admin(v_actor)
    into v_is_admin;

  select *
    into v_report
  from greenspot.greenspot_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found.';
  end if;

  v_current_state := coalesce(v_report.lifecycle_state, 'reported');

  if v_current_state = v_next_state then
    return jsonb_build_object(
      'ok', true,
      'report_id', p_report_id,
      'previous_state', v_current_state,
      'next_state', v_next_state,
      'unchanged', true
    );
  end if;

  v_transition_allowed := case
    when v_current_state = 'reported' and v_next_state in ('accepted', 'rejected', 'archived') then true
    when v_current_state = 'accepted' and v_next_state in ('in_progress', 'verified', 'completed', 'rejected', 'archived') then true
    when v_current_state = 'in_progress' and v_next_state in ('verified', 'completed', 'rejected', 'archived') then true
    when v_current_state = 'verified' and v_next_state in ('completed', 'archived') then true
    when v_current_state = 'completed' and v_next_state in ('archived') then true
    when v_current_state = 'rejected' and v_next_state in ('archived') then true
    else false
  end;

  if not v_transition_allowed then
    raise exception 'Invalid lifecycle transition: % -> %.', v_current_state, v_next_state;
  end if;

  if v_is_admin then
    v_permission_allowed := true;
  elsif v_report.accepted_by = v_actor and v_next_state in ('in_progress', 'verified', 'completed') then
    v_permission_allowed := true;
  end if;

  if not v_permission_allowed then
    raise exception 'Not authorized to transition report to %.', v_next_state;
  end if;

  if v_next_state = 'accepted' then
    select coalesce(
      nullif(trim(full_name), ''),
      nullif(trim(username), ''),
      nullif(split_part(coalesce(email, ''), '@', 1), ''),
      'Community Member'
    )
      into v_actor_name
    from greenspot.greenspot_profiles
    where id = v_actor;

    v_status := 'Accepted by ' || coalesce(v_actor_name, 'Community Member');
  elsif v_next_state = 'in_progress' then
    v_status := 'In progress';
  elsif v_next_state = 'verified' then
    v_status := 'Verified';
  elsif v_next_state = 'completed' then
    v_status := 'Completed';
  elsif v_next_state = 'rejected' then
    v_status := 'Rejected';
  elsif v_next_state = 'archived' then
    v_status := 'Archived';
  else
    v_status := 'Pending';
  end if;

  update greenspot.greenspot_reports
  set
    lifecycle_state = v_next_state,
    status = coalesce(v_status, greenspot.greenspot_reports.status),
    accepted_at = case
      when v_next_state = 'accepted' then coalesce(greenspot.greenspot_reports.accepted_at, now())
      else greenspot.greenspot_reports.accepted_at
    end,
    accepted_by = case
      when v_next_state = 'accepted' then coalesce(greenspot.greenspot_reports.accepted_by, v_actor)
      else greenspot.greenspot_reports.accepted_by
    end,
    in_progress_at = case
      when v_next_state = 'in_progress' then coalesce(greenspot.greenspot_reports.in_progress_at, now())
      else greenspot.greenspot_reports.in_progress_at
    end,
    in_progress_by = case
      when v_next_state = 'in_progress' then coalesce(greenspot.greenspot_reports.in_progress_by, v_actor)
      else greenspot.greenspot_reports.in_progress_by
    end,
    verified_at = case
      when v_next_state = 'verified' then coalesce(greenspot.greenspot_reports.verified_at, now())
      else greenspot.greenspot_reports.verified_at
    end,
    verified_by = case
      when v_next_state = 'verified' then coalesce(greenspot.greenspot_reports.verified_by, v_actor)
      else greenspot.greenspot_reports.verified_by
    end,
    completed_at = case
      when v_next_state = 'completed' then coalesce(greenspot.greenspot_reports.completed_at, now())
      else greenspot.greenspot_reports.completed_at
    end,
    completed_by = case
      when v_next_state = 'completed' then coalesce(greenspot.greenspot_reports.completed_by, v_actor)
      else greenspot.greenspot_reports.completed_by
    end,
    rejected_at = case
      when v_next_state = 'rejected' then coalesce(greenspot.greenspot_reports.rejected_at, now())
      else greenspot.greenspot_reports.rejected_at
    end,
    rejected_by = case
      when v_next_state = 'rejected' then coalesce(greenspot.greenspot_reports.rejected_by, v_actor)
      else greenspot.greenspot_reports.rejected_by
    end,
    rejected_reason = case
      when v_next_state = 'rejected' then coalesce(v_reason, greenspot.greenspot_reports.rejected_reason)
      else greenspot.greenspot_reports.rejected_reason
    end,
    updated_at = now()
  where id = p_report_id
  returning * into v_report;

  v_action := 'report.lifecycle.' || v_next_state;

  insert into greenspot.report_lifecycle_events (
    report_id,
    actor_user_id,
    action,
    previous_state,
    next_state,
    reason,
    metadata
  )
  values (
    p_report_id,
    v_actor,
    v_action,
    v_current_state,
    v_next_state,
    v_reason,
    jsonb_build_object(
      'status', v_report.status,
      'is_admin_action', v_is_admin
    )
  );

  if v_is_admin then
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
      v_actor,
      v_report.user_id,
      'report',
      p_report_id::text,
      v_action,
      v_reason,
      jsonb_build_object(
        'previous_state', v_current_state,
        'next_state', v_next_state,
        'status', v_report.status
      )
    );
  end if;

  if v_report.user_id is not null and v_report.user_id <> v_actor then
    v_title := case
      when v_next_state = 'in_progress' then 'Report in progress'
      when v_next_state = 'verified' then 'Report verified'
      when v_next_state = 'completed' then 'Report completed'
      when v_next_state = 'rejected' then 'Report rejected'
      when v_next_state = 'archived' then 'Report archived'
      when v_next_state = 'accepted' then 'Your report was accepted'
      else 'Report updated'
    end;

    v_body := case
      when v_next_state = 'in_progress' then 'A volunteer started active care on your reported area.'
      when v_next_state = 'verified' then 'Your report has been verified by the GreenSpot team.'
      when v_next_state = 'completed' then 'Care tasks for your reported area are complete.'
      when v_next_state = 'rejected' then coalesce(v_reason, 'Your report was reviewed and marked as rejected.')
      when v_next_state = 'archived' then coalesce(v_reason, 'This report has been archived.')
      when v_next_state = 'accepted' then 'A volunteer accepted your report and scheduled care tasks.'
      else 'Your report lifecycle status has changed.'
    end;

    perform greenspot.enqueue_notification_internal(
      v_report.user_id,
      v_action,
      v_title,
      v_body,
      'report:lifecycle:' || p_report_id::text || ':' || v_next_state,
      jsonb_build_object(
        'report_id', p_report_id,
        'previous_state', v_current_state,
        'next_state', v_next_state,
        'updated_by', v_actor
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'report_id', p_report_id,
    'previous_state', v_current_state,
    'next_state', v_next_state,
    'status', v_report.status,
    'accepted_at', v_report.accepted_at,
    'accepted_by', v_report.accepted_by,
    'in_progress_at', v_report.in_progress_at,
    'in_progress_by', v_report.in_progress_by,
    'verified_at', v_report.verified_at,
    'verified_by', v_report.verified_by,
    'completed_at', v_report.completed_at,
    'completed_by', v_report.completed_by,
    'rejected_at', v_report.rejected_at,
    'rejected_by', v_report.rejected_by,
    'rejected_reason', v_report.rejected_reason
  );
end;
$$;

revoke all on function greenspot.transition_report_lifecycle(uuid, text, text) from public;
grant execute on function greenspot.transition_report_lifecycle(uuid, text, text) to authenticated;

select pg_notify('pgrst', 'reload schema');