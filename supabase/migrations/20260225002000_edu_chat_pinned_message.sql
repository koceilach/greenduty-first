-- EDU chat: optional server-side storage for pinned message per participant.
-- Feature works locally without this column, but this enables cross-device persistence.

alter table public.conversation_participants
  add column if not exists pinned_message_id uuid references public.messages(id) on delete set null;

create index if not exists idx_cp_user_pinned_message
  on public.conversation_participants (user_id, pinned_message_id);

select pg_notify('pgrst', 'reload schema');
