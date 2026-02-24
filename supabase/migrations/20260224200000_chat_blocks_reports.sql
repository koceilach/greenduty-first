-- Chat moderation tables: user block + user report

create table if not exists public.chat_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.chat_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'unspecified',
  details text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create index if not exists idx_chat_user_blocks_blocked
  on public.chat_user_blocks (blocked_id, created_at desc);

create index if not exists idx_chat_user_reports_reported
  on public.chat_user_reports (reported_user_id, created_at desc);

alter table public.chat_user_blocks enable row level security;
alter table public.chat_user_reports enable row level security;

drop policy if exists "chat_user_blocks: read own or blocked-side" on public.chat_user_blocks;
create policy "chat_user_blocks: read own or blocked-side"
  on public.chat_user_blocks for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

drop policy if exists "chat_user_blocks: insert own" on public.chat_user_blocks;
create policy "chat_user_blocks: insert own"
  on public.chat_user_blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "chat_user_blocks: delete own" on public.chat_user_blocks;
create policy "chat_user_blocks: delete own"
  on public.chat_user_blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "chat_user_reports: read own" on public.chat_user_reports;
create policy "chat_user_reports: read own"
  on public.chat_user_reports for select
  using (reporter_id = auth.uid());

drop policy if exists "chat_user_reports: insert own" on public.chat_user_reports;
create policy "chat_user_reports: insert own"
  on public.chat_user_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

select pg_notify('pgrst', 'reload schema');
