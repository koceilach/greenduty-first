-- Enable sender-only message editing with edit history tracking.
-- Keeps previous versions visible to conversation participants.

create table if not exists public.message_edit_history (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  editor_id uuid not null references auth.users(id) on delete cascade,
  previous_content text,
  new_content text,
  edited_at timestamptz not null default now()
);

create index if not exists idx_message_edit_history_message
  on public.message_edit_history (message_id, edited_at desc);

create index if not exists idx_message_edit_history_editor
  on public.message_edit_history (editor_id, edited_at desc);

alter table public.message_edit_history enable row level security;

drop policy if exists "Read message edit history as participant" on public.message_edit_history;
create policy "Read message edit history as participant"
  on public.message_edit_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      join public.conversation_participants cp
        on cp.conversation_id = m.conversation_id
      where m.id = message_edit_history.message_id
        and cp.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "Insert own message edit history" on public.message_edit_history;
create policy "Insert own message edit history"
  on public.message_edit_history
  for insert
  to authenticated
  with check (
    editor_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      where m.id = message_edit_history.message_id
        and m.sender_id = auth.uid()
        and m.message_type = 'text'
        and m.deleted_at is null
    )
  );

drop policy if exists "Update own messages" on public.messages;
drop policy if exists "Users update own messages" on public.messages;
drop policy if exists "Update own text messages content" on public.messages;
create policy "Update own text messages content"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = auth.uid()
    and message_type = 'text'
    and deleted_at is null
  )
  with check (
    sender_id = auth.uid()
    and message_type = 'text'
    and deleted_at is null
  );

create or replace function public.guard_and_track_message_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if old.sender_id <> auth.uid() then
    raise exception 'You can edit only your own messages.';
  end if;

  if old.deleted_at is not null then
    raise exception 'Deleted messages cannot be edited.';
  end if;

  if old.message_type <> 'text' then
    raise exception 'Only text messages can be edited.';
  end if;

  if new.sender_id <> old.sender_id
     or new.conversation_id <> old.conversation_id
     or new.message_type <> old.message_type
     or new.media_url is distinct from old.media_url
     or new.media_duration is distinct from old.media_duration
     or new.reply_to_id is distinct from old.reply_to_id
     or new.deleted_at is distinct from old.deleted_at then
    raise exception 'Only message content can be edited.';
  end if;

  if new.content is null or btrim(new.content) = '' then
    raise exception 'Message content cannot be empty.';
  end if;

  if new.content is distinct from old.content then
    insert into public.message_edit_history (
      message_id,
      editor_id,
      previous_content,
      new_content,
      edited_at
    )
    values (
      old.id,
      auth.uid(),
      old.content,
      new.content,
      now()
    );

    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_guard_edit on public.messages;
create trigger trg_messages_guard_edit
before update on public.messages
for each row
execute function public.guard_and_track_message_edit();

do $$
begin
  if exists (
    select 1
    from pg_publication p
    where p.pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'message_edit_history'
  ) then
    alter publication supabase_realtime add table public.message_edit_history;
  end if;
exception
  when duplicate_object then
    null;
end $$;

select pg_notify('pgrst', 'reload schema');
