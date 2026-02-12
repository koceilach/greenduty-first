-- ============================================================
-- Friend Requests + Extended Profile Info for Education
-- ============================================================

-- 1. Friend requests table ──────────────────────────────────
create table if not exists public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sender_id, receiver_id)
);

-- 2. Friendships table (materialised accepted pairs) ────────
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)                       -- canonical ordering avoids dupes
);

-- 3. Extended profile columns ───────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone') then
    alter table public.profiles add column phone text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='website') then
    alter table public.profiles add column website text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='education') then
    alter table public.profiles add column education text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='work') then
    alter table public.profiles add column work text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='date_of_birth') then
    alter table public.profiles add column date_of_birth date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='gender') then
    alter table public.profiles add column gender text;
  end if;
end $$;

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_fr_sender   on public.friend_requests(sender_id);
create index if not exists idx_fr_receiver on public.friend_requests(receiver_id);
create index if not exists idx_fr_status   on public.friend_requests(status);
create index if not exists idx_fs_user_a   on public.friendships(user_a);
create index if not exists idx_fs_user_b   on public.friendships(user_b);

-- ============================================================
-- RLS
-- ============================================================
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

-- Friend requests: sender and receiver can read
create policy "Read own friend requests"
  on public.friend_requests for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- Users can send friend requests
create policy "Send friend request"
  on public.friend_requests for insert
  with check (sender_id = auth.uid());

-- Receiver can update (accept/decline), sender can update (cancel)
create policy "Update own friend requests"
  on public.friend_requests for update
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- Sender can delete (cancel pending requests)
create policy "Delete own friend requests"
  on public.friend_requests for delete
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- Friendships: friends can read their own
create policy "Read own friendships"
  on public.friendships for select
  using (user_a = auth.uid() or user_b = auth.uid());

-- Authenticated users can insert friendships
create policy "Insert friendships"
  on public.friendships for insert
  with check (auth.uid() is not null);

-- Friends can delete (unfriend)
create policy "Delete own friendships"
  on public.friendships for delete
  using (user_a = auth.uid() or user_b = auth.uid());

-- ============================================================
-- Trigger: auto-create friendship when request accepted
-- ============================================================
create or replace function public.handle_friend_request_accepted()
returns trigger language plpgsql security definer as $$
declare
  a uuid;
  b uuid;
begin
  if NEW.status = 'accepted' and (OLD.status is null or OLD.status = 'pending') then
    -- Canonical ordering: smaller UUID first
    if NEW.sender_id < NEW.receiver_id then
      a := NEW.sender_id;
      b := NEW.receiver_id;
    else
      a := NEW.receiver_id;
      b := NEW.sender_id;
    end if;
    insert into public.friendships (user_a, user_b)
    values (a, b)
    on conflict (user_a, user_b) do nothing;
  end if;
  return NEW;
end;
$$;

create trigger trg_friend_request_accepted
  after update on public.friend_requests
  for each row execute function public.handle_friend_request_accepted();

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.friend_requests;
