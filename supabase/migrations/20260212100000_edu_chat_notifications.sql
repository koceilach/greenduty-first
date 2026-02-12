-- ============================================================
-- EDU Chat / Messaging + Notifications + Presence
-- ============================================================

-- 1. Conversations ──────────────────────────────────────────
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'direct' check (type in ('direct','group')),
  name       text,                        -- group chat name (nullable for DMs)
  avatar_url text,                        -- group avatar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Conversation participants ──────────────────────────────
create table if not exists public.conversation_participants (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member' check (role in ('member','admin')),
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  unique (conversation_id, user_id)
);

-- 3. Messages ───────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text,                                          -- text body
  message_type    text not null default 'text' check (message_type in ('text','voice','image','system')),
  media_url       text,                                          -- voice / image url
  media_duration  integer,                                        -- voice length (seconds)
  reply_to_id     uuid references public.messages(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz                                     -- soft‑delete
);

-- 4. Notifications ──────────────────────────────────────────
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('like','comment','follow','message','mention','system')),
  title         text not null,
  body          text not null default '',
  actor_id      uuid references auth.users(id) on delete set null,
  resource_type text check (resource_type in ('post','comment','conversation','profile')),
  resource_id   text,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 5. User presence ──────────────────────────────────────────
create table if not exists public.user_presence (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  status       text not null default 'offline' check (status in ('online','offline','away')),
  last_seen_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_cp_conv   on public.conversation_participants(conversation_id);
create index if not exists idx_cp_user   on public.conversation_participants(user_id);
create index if not exists idx_msg_conv  on public.messages(conversation_id, created_at desc);
create index if not exists idx_msg_sender on public.messages(sender_id);
create index if not exists idx_notif_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notif_read on public.notifications(user_id, read);
create index if not exists idx_presence   on public.user_presence(status);

-- ============================================================
-- RLS
-- ============================================================
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.user_presence enable row level security;

-- Conversations: read if participant
create policy "Participants read conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

create policy "Authenticated users create conversations"
  on public.conversations for insert
  with check (auth.uid() is not null);

create policy "Participants update conversations"
  on public.conversations for update
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

-- Conversation participants: read/insert if participant or joining
create policy "Read own participations"
  on public.conversation_participants for select
  using (user_id = auth.uid() or exists (
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
  ));

create policy "Insert participation"
  on public.conversation_participants for insert
  with check (auth.uid() is not null);

create policy "Update own participation"
  on public.conversation_participants for update
  using (user_id = auth.uid());

-- Messages: read if in conversation, insert if in conversation
create policy "Read messages in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "Send messages to own conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "Update own messages"
  on public.messages for update
  using (sender_id = auth.uid());

-- Notifications: own only
create policy "Read own notifications"
  on public.notifications for select using (user_id = auth.uid());

create policy "Insert notifications"
  on public.notifications for insert with check (auth.uid() is not null);

create policy "Update own notifications"
  on public.notifications for update using (user_id = auth.uid());

-- Presence: anyone can read, own user can update
create policy "Read presence"
  on public.user_presence for select using (true);

create policy "Upsert own presence"
  on public.user_presence for insert with check (user_id = auth.uid());

create policy "Update own presence"
  on public.user_presence for update using (user_id = auth.uid());

-- ============================================================
-- Realtime: enable for messages and presence
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.user_presence;
alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- Helper: update conversation.updated_at on new message
-- ============================================================
create or replace function public.update_conversation_timestamp()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations set updated_at = now() where id = NEW.conversation_id;
  return NEW;
end;
$$;

create trigger trg_message_update_conv
  after insert on public.messages
  for each row execute function public.update_conversation_timestamp();

-- Add bio / cover columns to profiles if missing
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='bio') then
    alter table public.profiles add column bio text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='cover_url') then
    alter table public.profiles add column cover_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='location') then
    alter table public.profiles add column location text;
  end if;
end $$;
