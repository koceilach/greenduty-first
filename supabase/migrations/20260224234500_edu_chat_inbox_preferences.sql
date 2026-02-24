-- EDU chat inbox: participant-level preferences + robust conversation ID RPC.

alter table public.conversation_participants
  add column if not exists is_pinned boolean not null default false,
  add column if not exists is_muted boolean not null default false;

create index if not exists idx_cp_user_prefs
  on public.conversation_participants (user_id, is_pinned desc, joined_at desc);

create or replace function public.get_user_conversation_ids(
  p_user_id uuid default auth.uid()
)
returns table (conversation_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select cp.conversation_id
  from public.conversation_participants cp
  where cp.user_id = auth.uid()
    and coalesce(p_user_id, auth.uid()) = auth.uid()
  order by cp.joined_at desc;
$$;

revoke all on function public.get_user_conversation_ids(uuid) from public;
grant execute on function public.get_user_conversation_ids(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
