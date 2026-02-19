-- Separate marketplace chat from education chat tables.
-- This creates marketplace-specific chat tables with marketplace_* names
-- so policy names and data stay isolated.

create table if not exists public.marketplace_conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct', 'group')),
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations(id) on delete cascade,
  user_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, user_id)
);

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations(id) on delete cascade,
  sender_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  content text,
  message_type text not null default 'text' check (message_type in ('text', 'voice', 'image', 'system')),
  media_url text,
  media_duration integer,
  reply_to_id uuid references public.marketplace_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists marketplace_cp_conversation_idx
  on public.marketplace_conversation_participants (conversation_id);

create index if not exists marketplace_cp_user_idx
  on public.marketplace_conversation_participants (user_id);

create index if not exists marketplace_messages_conversation_idx
  on public.marketplace_messages (conversation_id, created_at desc);

create index if not exists marketplace_messages_sender_idx
  on public.marketplace_messages (sender_id);

alter table public.marketplace_conversations enable row level security;
alter table public.marketplace_conversation_participants enable row level security;
alter table public.marketplace_messages enable row level security;

create or replace function public.marketplace_is_conversation_participant(
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
    from public.marketplace_conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.marketplace_is_conversation_participant(uuid) from public;
grant execute on function public.marketplace_is_conversation_participant(uuid) to authenticated;

drop policy if exists "Marketplace participants read conversations" on public.marketplace_conversations;
create policy "Marketplace participants read conversations"
  on public.marketplace_conversations
  for select
  using (
    exists (
      select 1
      from public.marketplace_conversation_participants cp
      where cp.conversation_id = id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Marketplace authenticated create conversations" on public.marketplace_conversations;
create policy "Marketplace authenticated create conversations"
  on public.marketplace_conversations
  for insert
  with check (auth.uid() is not null);

drop policy if exists "Marketplace participants update conversations" on public.marketplace_conversations;
create policy "Marketplace participants update conversations"
  on public.marketplace_conversations
  for update
  using (
    exists (
      select 1
      from public.marketplace_conversation_participants cp
      where cp.conversation_id = id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Marketplace participants read participations" on public.marketplace_conversation_participants;
create policy "Marketplace participants read participations"
  on public.marketplace_conversation_participants
  for select
  using (
    user_id = auth.uid()
    or public.marketplace_is_conversation_participant(conversation_id)
  );

drop policy if exists "Marketplace authenticated insert participations" on public.marketplace_conversation_participants;
create policy "Marketplace authenticated insert participations"
  on public.marketplace_conversation_participants
  for insert
  with check (auth.uid() is not null);

drop policy if exists "Marketplace users update own participation" on public.marketplace_conversation_participants;
create policy "Marketplace users update own participation"
  on public.marketplace_conversation_participants
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Marketplace participants read messages" on public.marketplace_messages;
create policy "Marketplace participants read messages"
  on public.marketplace_messages
  for select
  using (
    exists (
      select 1
      from public.marketplace_conversation_participants cp
      where cp.conversation_id = marketplace_messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Marketplace participants send messages" on public.marketplace_messages;
create policy "Marketplace participants send messages"
  on public.marketplace_messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.marketplace_conversation_participants cp
      where cp.conversation_id = marketplace_messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Marketplace users update own messages" on public.marketplace_messages;
create policy "Marketplace users update own messages"
  on public.marketplace_messages
  for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create or replace function public.marketplace_update_conversation_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_marketplace_message_update_conversation on public.marketplace_messages;
create trigger trg_marketplace_message_update_conversation
  after insert on public.marketplace_messages
  for each row execute function public.marketplace_update_conversation_timestamp();

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'marketplace_messages'
    ) then
      alter publication supabase_realtime add table public.marketplace_messages;
    end if;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
