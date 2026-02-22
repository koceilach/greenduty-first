-- Fix: allow trusted migration/service-role contexts to pass profile guard trigger
-- while still blocking unauthenticated client-side updates.

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

select pg_notify('pgrst', 'reload schema');