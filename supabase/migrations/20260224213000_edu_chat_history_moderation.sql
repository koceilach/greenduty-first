-- EDU chat history durability + moderation access
-- 1) Stores conversation last-message snapshot for fast persistent history.
-- 2) Extends user reports with conversation context and admin review workflow.
-- 3) Adds admin-safe RLS access needed to review reported chats.

create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(p_user_id, auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public;
grant execute on function public.is_platform_admin(uuid) to authenticated;

alter table public.conversations
  add column if not exists last_message_id uuid references public.messages(id) on delete set null,
  add column if not exists last_message_sender_id uuid references auth.users(id) on delete set null,
  add column if not exists last_message_type text check (last_message_type in ('text', 'voice', 'image', 'system')),
  add column if not exists last_message_preview text,
  add column if not exists last_message_at timestamptz;

create index if not exists idx_conversations_updated_at
  on public.conversations (updated_at desc);

create index if not exists idx_conversations_last_message_at
  on public.conversations (last_message_at desc);

create index if not exists idx_conversations_last_message_sender
  on public.conversations (last_message_sender_id);

create or replace function public.compute_message_preview(
  p_type text,
  p_content text
)
returns text
language sql
immutable
as $$
  select case
    when p_type = 'image' then coalesce(nullif(trim(p_content), ''), 'Photo')
    when p_type = 'voice' then coalesce(nullif(trim(p_content), ''), 'Voice message')
    when p_type = 'system' then coalesce(nullif(trim(p_content), ''), 'System message')
    else coalesce(nullif(trim(p_content), ''), 'Message')
  end;
$$;

create or replace function public.sync_conversation_message_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid := coalesce(new.conversation_id, old.conversation_id);
  v_last record;
begin
  if v_conversation_id is null then
    return coalesce(new, old);
  end if;

  select
    m.id,
    m.sender_id,
    m.message_type,
    m.content,
    m.created_at
  into v_last
  from public.messages m
  where m.conversation_id = v_conversation_id
    and m.deleted_at is null
  order by m.created_at desc, m.id desc
  limit 1;

  if found then
    update public.conversations c
    set
      updated_at = greatest(c.updated_at, v_last.created_at),
      last_message_id = v_last.id,
      last_message_sender_id = v_last.sender_id,
      last_message_type = v_last.message_type,
      last_message_preview = public.compute_message_preview(v_last.message_type, v_last.content),
      last_message_at = v_last.created_at
    where c.id = v_conversation_id;
  else
    update public.conversations c
    set
      last_message_id = null,
      last_message_sender_id = null,
      last_message_type = null,
      last_message_preview = null,
      last_message_at = null
    where c.id = v_conversation_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_message_update_conv on public.messages;
drop trigger if exists trg_messages_sync_conversation_snapshot on public.messages;

create trigger trg_messages_sync_conversation_snapshot
after insert or update of content, message_type, deleted_at
on public.messages
for each row execute function public.sync_conversation_message_snapshot();

with latest as (
  select distinct on (m.conversation_id)
    m.conversation_id,
    m.id,
    m.sender_id,
    m.message_type,
    public.compute_message_preview(m.message_type, m.content) as preview,
    m.created_at
  from public.messages m
  where m.deleted_at is null
  order by m.conversation_id, m.created_at desc, m.id desc
)
update public.conversations c
set
  updated_at = greatest(c.updated_at, latest.created_at),
  last_message_id = latest.id,
  last_message_sender_id = latest.sender_id,
  last_message_type = latest.message_type,
  last_message_preview = latest.preview,
  last_message_at = latest.created_at
from latest
where c.id = latest.conversation_id;

update public.conversations c
set
  last_message_id = null,
  last_message_sender_id = null,
  last_message_type = null,
  last_message_preview = null,
  last_message_at = null
where not exists (
  select 1
  from public.messages m
  where m.conversation_id = c.id
    and m.deleted_at is null
);

alter table public.chat_user_reports
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.chat_user_reports
  add column if not exists status text;

update public.chat_user_reports
set status = 'open'
where status is null;

alter table public.chat_user_reports
  alter column status set default 'open',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_user_reports_status_check'
  ) then
    alter table public.chat_user_reports
      add constraint chat_user_reports_status_check
      check (status in ('open', 'under_review', 'resolved', 'dismissed'));
  end if;
end $$;

create index if not exists idx_chat_user_reports_status_created
  on public.chat_user_reports (status, created_at desc);

create index if not exists idx_chat_user_reports_conversation
  on public.chat_user_reports (conversation_id, created_at desc);

create index if not exists idx_chat_user_reports_reporter
  on public.chat_user_reports (reporter_id, created_at desc);

drop policy if exists "chat_user_reports: read own" on public.chat_user_reports;
drop policy if exists "chat_user_reports: read own or admin" on public.chat_user_reports;
create policy "chat_user_reports: read own or admin"
  on public.chat_user_reports
  for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or public.is_platform_admin(auth.uid())
  );

drop policy if exists "chat_user_reports: insert own" on public.chat_user_reports;
create policy "chat_user_reports: insert own"
  on public.chat_user_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "chat_user_reports: admin review update" on public.chat_user_reports;
create policy "chat_user_reports: admin review update"
  on public.chat_user_reports
  for update
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists "Admins read all chat conversations" on public.conversations;
create policy "Admins read all chat conversations"
  on public.conversations
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

drop policy if exists "Admins read all chat participations" on public.conversation_participants;
create policy "Admins read all chat participations"
  on public.conversation_participants
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

drop policy if exists "Admins read all chat messages" on public.messages;
create policy "Admins read all chat messages"
  on public.messages
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

create or replace function public.get_chat_report_thread(
  p_report_id uuid,
  p_limit integer default 200
)
returns table (
  report_id uuid,
  conversation_id uuid,
  message_id uuid,
  sender_id uuid,
  content text,
  message_type text,
  media_url text,
  created_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_conversation_id uuid;
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_platform_admin(v_actor) then
    raise exception 'Only admins can review report threads.';
  end if;

  select r.conversation_id
    into v_conversation_id
  from public.chat_user_reports r
  where r.id = p_report_id;

  if v_conversation_id is null then
    return;
  end if;

  return query
  select
    p_report_id as report_id,
    m.conversation_id,
    m.id as message_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.media_url,
    m.created_at,
    m.deleted_at
  from public.messages m
  where m.conversation_id = v_conversation_id
  order by m.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.get_chat_report_thread(uuid, integer) from public;
grant execute on function public.get_chat_report_thread(uuid, integer) to authenticated;

select pg_notify('pgrst', 'reload schema');
