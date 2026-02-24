-- Create/find EDU direct conversations in a single DB transaction.
-- This avoids client-side RLS edge cases when inserting conversations first.

create or replace function public.find_or_create_direct_conversation(
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
    raise exception 'Authentication required to start a conversation.';
  end if;

  if p_other_user_id is null then
    raise exception 'Other user id is required.';
  end if;

  if p_other_user_id = v_actor then
    raise exception 'You cannot message your own account.';
  end if;

  select c.id
    into v_existing_conversation
  from public.conversations c
  join public.conversation_participants me
    on me.conversation_id = c.id
   and me.user_id = v_actor
  join public.conversation_participants them
    on them.conversation_id = c.id
   and them.user_id = p_other_user_id
  where c.type = 'direct'
  order by c.updated_at desc
  limit 1;

  if v_existing_conversation is not null then
    update public.conversations
       set updated_at = now()
     where id = v_existing_conversation;
    return v_existing_conversation;
  end if;

  insert into public.conversations (type)
  values ('direct')
  returning id into v_new_conversation;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (v_new_conversation, v_actor),
    (v_new_conversation, p_other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return v_new_conversation;
end;
$$;

revoke all on function public.find_or_create_direct_conversation(uuid) from public;
grant execute on function public.find_or_create_direct_conversation(uuid) to authenticated;

-- Ensure insert policy exists for any remaining client-driven flows.
drop policy if exists "Authenticated users create conversations" on public.conversations;
create policy "Authenticated users create conversations"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() is not null);

select pg_notify('pgrst', 'reload schema');
