-- ============================================================
-- Education social engine foundation upgrade
-- NOTE: This migration upgrades existing schema and keeps legacy tables.
-- ============================================================

-- 1) Follows table (upgrade-safe)
create table if not exists public.profile_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_no_self_follow check (follower_id <> following_id),
  constraint profile_follows_unique unique (follower_id, following_id)
);

create index if not exists idx_profile_follows_follower_created
  on public.profile_follows (follower_id, created_at desc);

create index if not exists idx_profile_follows_following_created
  on public.profile_follows (following_id, created_at desc);

alter table public.profile_follows enable row level security;

drop policy if exists "profile_follows: read all" on public.profile_follows;
create policy "profile_follows: read all"
  on public.profile_follows
  for select
  using (true);

drop policy if exists "profile_follows: insert own" on public.profile_follows;
create policy "profile_follows: insert own"
  on public.profile_follows
  for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "profile_follows: delete own" on public.profile_follows;
create policy "profile_follows: delete own"
  on public.profile_follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);

-- 2) Unified likes table (upgrade-safe)
create table if not exists public.edu_social_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.edu_posts(id) on delete cascade,
  reel_id uuid references public.edu_reels(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint edu_social_likes_target_check check (
    ((post_id is not null)::int + (reel_id is not null)::int) = 1
  )
);

create unique index if not exists idx_edu_social_likes_user_post_unique
  on public.edu_social_likes (user_id, post_id)
  where post_id is not null;

create unique index if not exists idx_edu_social_likes_user_reel_unique
  on public.edu_social_likes (user_id, reel_id)
  where reel_id is not null;

create index if not exists idx_edu_social_likes_created
  on public.edu_social_likes (created_at desc);

alter table public.edu_social_likes enable row level security;

drop policy if exists "edu_social_likes: read all" on public.edu_social_likes;
create policy "edu_social_likes: read all"
  on public.edu_social_likes
  for select
  using (true);

drop policy if exists "edu_social_likes: insert own" on public.edu_social_likes;
create policy "edu_social_likes: insert own"
  on public.edu_social_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "edu_social_likes: delete own" on public.edu_social_likes;
create policy "edu_social_likes: delete own"
  on public.edu_social_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Backfill from legacy likes tables (idempotent)
insert into public.edu_social_likes (user_id, post_id, created_at)
select l.user_id, l.post_id, l.created_at
from public.edu_likes l
on conflict do nothing;

insert into public.edu_social_likes (user_id, reel_id, created_at)
select rl.user_id, rl.reel_id, rl.created_at
from public.edu_reel_likes rl
on conflict do nothing;

-- 3) Unified bookmarks table (upgrade-safe)
create table if not exists public.edu_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.edu_posts(id) on delete cascade,
  reel_id uuid references public.edu_reels(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint edu_bookmarks_target_check check (
    ((post_id is not null)::int + (reel_id is not null)::int) = 1
  )
);

create unique index if not exists idx_edu_bookmarks_user_post_unique
  on public.edu_bookmarks (user_id, post_id)
  where post_id is not null;

create unique index if not exists idx_edu_bookmarks_user_reel_unique
  on public.edu_bookmarks (user_id, reel_id)
  where reel_id is not null;

create index if not exists idx_edu_bookmarks_created
  on public.edu_bookmarks (created_at desc);

alter table public.edu_bookmarks enable row level security;

drop policy if exists "edu_bookmarks: read own" on public.edu_bookmarks;
create policy "edu_bookmarks: read own"
  on public.edu_bookmarks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "edu_bookmarks: insert own" on public.edu_bookmarks;
create policy "edu_bookmarks: insert own"
  on public.edu_bookmarks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "edu_bookmarks: delete own" on public.edu_bookmarks;
create policy "edu_bookmarks: delete own"
  on public.edu_bookmarks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Backfill from legacy saves table (idempotent)
insert into public.edu_bookmarks (user_id, post_id, created_at)
select s.user_id, s.post_id, s.created_at
from public.edu_saves s
on conflict do nothing;

-- 4) Notifications table upgrade-safe (already exists in this project)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  actor_id uuid references auth.users(id) on delete set null,
  resource_type text,
  resource_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ensure notification type/resource checks include follow + like + reel/profile targets
-- (Drop-and-recreate by detected constraint names for idempotency.)
do $$
declare r record;
begin
  for r in
    select distinct c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.notifications'::regclass
      and c.contype = 'c'
      and a.attname = 'type'
  loop
    execute format('alter table public.notifications drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'like',
      'comment',
      'comment_reply',
      'follow',
      'message',
      'mention',
      'repost_story',
      'system'
    )
  );

do $$
declare r record;
begin
  for r in
    select distinct c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.notifications'::regclass
      and c.contype = 'c'
      and a.attname = 'resource_type'
  loop
    execute format('alter table public.notifications drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.notifications
  add constraint notifications_resource_type_check
  check (
    resource_type in ('post', 'reel', 'comment', 'conversation', 'profile', 'story')
    or resource_type is null
  );

-- 5) Trigger functions to auto-create notifications from follows/likes
create or replace function public.edu_notify_from_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  select coalesce(
    nullif(trim(ec.display_name), ''),
    nullif(trim(p.full_name), ''),
    nullif(trim(p.username), ''),
    'A learner'
  )
  into actor_name
  from public.profiles p
  left join public.edu_creators ec on ec.user_id = p.id
  where p.id = new.follower_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    actor_id,
    resource_type,
    resource_id
  )
  values (
    new.following_id,
    'follow',
    coalesce(actor_name, 'A learner') || ' started following you',
    '',
    new.follower_id,
    'profile',
    new.follower_id::text
  );

  return new;
end;
$$;

create or replace function public.edu_notify_from_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  target_owner uuid;
  target_title text;
  notif_type text := 'like';
  notif_resource_type text;
  notif_resource_id text;
begin
  if new.post_id is not null then
    notif_resource_type := 'post';
    notif_resource_id := new.post_id::text;

    select p.user_id, coalesce(nullif(trim(p.title), ''), 'your post')
      into target_owner, target_title
    from public.edu_posts p
    where p.id = new.post_id;
  elsif new.reel_id is not null then
    notif_resource_type := 'reel';
    notif_resource_id := new.reel_id::text;

    select r.author_id, 'your reel'
      into target_owner, target_title
    from public.edu_reels r
    where r.id = new.reel_id;
  else
    return new;
  end if;

  if target_owner is null or target_owner = new.user_id then
    return new;
  end if;

  select coalesce(
    nullif(trim(ec.display_name), ''),
    nullif(trim(p.full_name), ''),
    nullif(trim(p.username), ''),
    'A learner'
  )
  into actor_name
  from public.profiles p
  left join public.edu_creators ec on ec.user_id = p.id
  where p.id = new.user_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    actor_id,
    resource_type,
    resource_id
  )
  values (
    target_owner,
    notif_type,
    coalesce(actor_name, 'A learner') || ' liked ' || target_title,
    '',
    new.user_id,
    notif_resource_type,
    notif_resource_id
  );

  return new;
end;
$$;

drop trigger if exists trg_edu_notify_follow_insert on public.profile_follows;
create trigger trg_edu_notify_follow_insert
after insert on public.profile_follows
for each row execute function public.edu_notify_from_follow_insert();

drop trigger if exists trg_edu_notify_social_like_insert on public.edu_social_likes;
create trigger trg_edu_notify_social_like_insert
after insert on public.edu_social_likes
for each row execute function public.edu_notify_from_like_insert();

-- Realtime publication hooks
DO $$
BEGIN
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'profile_follows'
    ) then
      execute 'alter publication supabase_realtime add table public.profile_follows';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_social_likes'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_social_likes';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_bookmarks'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_bookmarks';
    end if;
  end if;
END;
$$;

select pg_notify('pgrst', 'reload schema');
