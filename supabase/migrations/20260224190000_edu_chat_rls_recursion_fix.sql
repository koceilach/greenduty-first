-- Fix infinite recursion in conversation_participants RLS policy.
-- Root cause: the SELECT policy queried conversation_participants
-- inside itself, which can recurse under RLS evaluation.

create or replace function public.is_conversation_participant(
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop policy if exists "Read own participations"
  on public.conversation_participants;

drop policy if exists "Participants read participations"
  on public.conversation_participants;

create policy "Read own participations"
  on public.conversation_participants
  for select
  using (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id)
  );

select pg_notify('pgrst', 'reload schema');
