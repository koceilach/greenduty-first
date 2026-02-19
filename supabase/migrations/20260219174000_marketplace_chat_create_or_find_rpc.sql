-- Create RPC to safely create/find marketplace direct chats without client-side
-- insert/select policy edge cases.

create or replace function public.marketplace_find_or_create_direct_conversation(
  p_other_user_id uuid
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
    return v_existing_conversation;
  end if;

  insert into public.marketplace_conversations (type)
  values ('direct')
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

revoke all on function public.marketplace_find_or_create_direct_conversation(uuid) from public;
grant execute on function public.marketplace_find_or_create_direct_conversation(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
