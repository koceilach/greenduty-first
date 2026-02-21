-- Marketplace hardening:
-- 1) remove email-based admin elevation from ensure_marketplace_profile
-- 2) transactional admin RPCs for seller approval and user deletion
-- 3) scalable conversation listing RPC (last message + unread count per conversation)

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
  v_user_id uuid := auth.uid();
  v_email text;
  v_username text;
  v_result jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  v_email := coalesce(p_email, (select email from auth.users where id = v_user_id));
  v_username := coalesce(p_username, split_part(coalesce(v_email, ''), '@', 1));
  if trim(coalesce(v_username, '')) = '' then
    v_username := 'user';
  end if;

  insert into public.marketplace_profiles (id, email, username, role)
  values (v_user_id, v_email, v_username, 'buyer')
  on conflict (id) do update
    set
      email = coalesce(excluded.email, marketplace_profiles.email),
      username = coalesce(
        case
          when marketplace_profiles.username is null or marketplace_profiles.username = ''
            then excluded.username
          else marketplace_profiles.username
        end,
        excluded.username
      );

  select jsonb_build_object(
    'id', mp.id,
    'email', mp.email,
    'username', mp.username,
    'role', mp.role,
    'bio', mp.bio,
    'store_name', mp.store_name,
    'avatar_url', mp.avatar_url,
    'location', mp.location,
    'store_latitude', mp.store_latitude,
    'store_longitude', mp.store_longitude,
    'created_at', mp.created_at,
    'updated_at', mp.updated_at
  )
  into v_result
  from public.marketplace_profiles mp
  where mp.id = v_user_id;

  return coalesce(v_result, jsonb_build_object('error', 'Profile not found'));
end;
$$;

create or replace function public.marketplace_admin_approve_seller_application(
  p_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_application public.marketplace_seller_applications%rowtype;
  v_profile public.marketplace_profiles%rowtype;
begin
  if v_admin_id is null then
    raise exception 'Authentication required for admin action.';
  end if;

  if not public.is_marketplace_admin() then
    raise exception 'Admin privileges required.';
  end if;

  select *
    into v_application
  from public.marketplace_seller_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Seller application not found.';
  end if;

  if coalesce(v_application.status, 'pending') = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'application_id', v_application.id,
      'status', 'approved',
      'already_approved', true
    );
  end if;

  select *
    into v_profile
  from public.marketplace_profiles
  where id = v_application.user_id
  for update;

  if not found then
    raise exception 'Applicant marketplace profile not found.';
  end if;

  update public.marketplace_profiles
  set
    role = case when v_profile.role = 'admin' then 'admin' else 'seller' end,
    store_name = coalesce(nullif(trim(v_application.store_name), ''), store_name),
    bio = coalesce(nullif(trim(v_application.bio), ''), bio),
    location = coalesce(nullif(trim(v_application.location), ''), location),
    updated_at = now()
  where id = v_application.user_id;

  update public.marketplace_seller_applications
  set
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    rejection_reason = null,
    updated_at = now()
  where id = v_application.id;

  return jsonb_build_object(
    'ok', true,
    'application_id', v_application.id,
    'user_id', v_application.user_id,
    'status', 'approved'
  );
end;
$$;

revoke all on function public.marketplace_admin_approve_seller_application(uuid) from public;
grant execute on function public.marketplace_admin_approve_seller_application(uuid) to authenticated;

create or replace function public.marketplace_admin_delete_marketplace_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_target_role text;
  v_deleted_apps integer := 0;
  v_deleted_profiles integer := 0;
begin
  if v_admin_id is null then
    raise exception 'Authentication required for admin action.';
  end if;

  if not public.is_marketplace_admin() then
    raise exception 'Admin privileges required.';
  end if;

  if p_user_id is null then
    raise exception 'Target user id is required.';
  end if;

  if p_user_id = v_admin_id then
    raise exception 'Admins cannot delete their own marketplace profile.';
  end if;

  select role
    into v_target_role
  from public.marketplace_profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Marketplace user not found.';
  end if;

  if v_target_role = 'admin' then
    raise exception 'Cannot delete another admin marketplace profile.';
  end if;

  delete from public.marketplace_seller_applications
  where user_id = p_user_id;
  get diagnostics v_deleted_apps = row_count;

  delete from public.marketplace_profiles
  where id = p_user_id;
  get diagnostics v_deleted_profiles = row_count;

  if v_deleted_profiles = 0 then
    raise exception 'Marketplace profile deletion failed.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'deleted_user_id', p_user_id,
    'deleted_applications', v_deleted_apps
  );
end;
$$;

revoke all on function public.marketplace_admin_delete_marketplace_user(uuid) from public;
grant execute on function public.marketplace_admin_delete_marketplace_user(uuid) to authenticated;

create or replace function public.marketplace_list_conversations()
returns table (
  conversation_id uuid,
  conversation_type text,
  conversation_name text,
  pinned_item_id uuid,
  pinned_item_title text,
  pinned_item_image_url text,
  pinned_item_price_dzd numeric,
  created_at timestamptz,
  updated_at timestamptz,
  unread_count integer,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_content text,
  last_message_type text,
  last_message_created_at timestamptz,
  other_user_id uuid,
  other_email text,
  other_username text,
  other_store_name text,
  other_avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required to list conversations.';
  end if;

  return query
  with my_participation as (
    select
      cp.conversation_id,
      cp.last_read_at
    from public.marketplace_conversation_participants cp
    where cp.user_id = v_actor
  )
  select
    c.id as conversation_id,
    c.type as conversation_type,
    c.name as conversation_name,
    c.pinned_item_id,
    c.pinned_item_title,
    c.pinned_item_image_url,
    c.pinned_item_price_dzd,
    c.created_at,
    c.updated_at,
    coalesce(unread.unread_count, 0) as unread_count,
    last_message.id as last_message_id,
    last_message.sender_id as last_message_sender_id,
    last_message.content as last_message_content,
    last_message.message_type as last_message_type,
    last_message.created_at as last_message_created_at,
    other_participant.user_id as other_user_id,
    other_profile.email as other_email,
    other_profile.username as other_username,
    other_profile.store_name as other_store_name,
    other_profile.avatar_url as other_avatar_url
  from my_participation mine
  join public.marketplace_conversations c
    on c.id = mine.conversation_id
  left join lateral (
    select
      m.id,
      m.sender_id,
      m.content,
      m.message_type,
      m.created_at
    from public.marketplace_messages m
    where m.conversation_id = c.id
      and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) as last_message
    on true
  left join lateral (
    select count(*)::int as unread_count
    from public.marketplace_messages m
    where m.conversation_id = c.id
      and m.deleted_at is null
      and m.sender_id <> v_actor
      and (mine.last_read_at is null or m.created_at > mine.last_read_at)
  ) as unread
    on true
  left join lateral (
    select cp.user_id
    from public.marketplace_conversation_participants cp
    where cp.conversation_id = c.id
      and cp.user_id <> v_actor
    order by cp.joined_at asc
    limit 1
  ) as other_participant
    on true
  left join public.marketplace_profiles other_profile
    on other_profile.id = other_participant.user_id
  order by c.updated_at desc;
end;
$$;

revoke all on function public.marketplace_list_conversations() from public;
grant execute on function public.marketplace_list_conversations() to authenticated;

select pg_notify('pgrst', 'reload schema');
