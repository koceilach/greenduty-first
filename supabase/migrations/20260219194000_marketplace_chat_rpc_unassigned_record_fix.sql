-- Fix runtime error:
-- record "v_item" is not assigned yet
-- by replacing record-based access with scalar variables.

create or replace function public.marketplace_find_or_create_direct_conversation(
  p_other_user_id uuid,
  p_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_existing_conversation uuid;
  v_new_conversation uuid;
  v_item_id uuid := null;
  v_item_title text := null;
  v_item_image_url text := null;
  v_item_price_dzd numeric(12, 2) := null;
begin
  if v_actor is null then
    raise exception 'Authentication required to open marketplace chat.';
  end if;

  if p_other_user_id is null then
    raise exception 'Other user id is required.';
  end if;

  if p_other_user_id = v_actor then
    raise exception 'You cannot message your own account.';
  end if;

  if not exists (
    select 1
    from public.marketplace_profiles mp
    where mp.id = v_actor
  ) then
    raise exception 'Marketplace profile not found for current user.';
  end if;

  if not exists (
    select 1
    from public.marketplace_profiles mp
    where mp.id = p_other_user_id
  ) then
    raise exception 'Marketplace profile not found for recipient.';
  end if;

  if p_item_id is not null then
    select i.id, i.title, i.image_url, i.price_dzd
      into v_item_id, v_item_title, v_item_image_url, v_item_price_dzd
    from public.marketplace_items i
    where i.id = p_item_id
    limit 1;
  end if;

  select c.id
    into v_existing_conversation
  from public.marketplace_conversations c
  join public.marketplace_conversation_participants me
    on me.conversation_id = c.id
   and me.user_id = v_actor
  join public.marketplace_conversation_participants them
    on them.conversation_id = c.id
   and them.user_id = p_other_user_id
  where c.type = 'direct'
  order by c.updated_at desc
  limit 1;

  if v_existing_conversation is not null then
    if v_item_id is not null then
      update public.marketplace_conversations
      set
        pinned_item_id = v_item_id,
        pinned_item_title = v_item_title,
        pinned_item_image_url = v_item_image_url,
        pinned_item_price_dzd = v_item_price_dzd,
        pinned_by = v_actor,
        pinned_at = now(),
        updated_at = now()
      where id = v_existing_conversation;
    end if;

    return v_existing_conversation;
  end if;

  insert into public.marketplace_conversations (
    type,
    pinned_item_id,
    pinned_item_title,
    pinned_item_image_url,
    pinned_item_price_dzd,
    pinned_by,
    pinned_at
  )
  values (
    'direct',
    v_item_id,
    v_item_title,
    v_item_image_url,
    v_item_price_dzd,
    case when v_item_id is null then null else v_actor end,
    case when v_item_id is null then null else now() end
  )
  returning id into v_new_conversation;

  insert into public.marketplace_conversation_participants (
    conversation_id,
    user_id
  )
  values
    (v_new_conversation, v_actor),
    (v_new_conversation, p_other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return v_new_conversation;
end;
$$;

revoke all on function public.marketplace_find_or_create_direct_conversation(uuid, uuid) from public;
grant execute on function public.marketplace_find_or_create_direct_conversation(uuid, uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
