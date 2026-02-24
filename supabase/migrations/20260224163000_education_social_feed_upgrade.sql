-- ============================================================
-- Education social feed hardening + performance + notifications
-- ============================================================

-- 1) Harden edu_posts for social feed usage
alter table public.edu_posts
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists resource_url text,
  add column if not exists visibility text not null default 'public';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'edu_posts_media_type_check'
      and conrelid = 'public.edu_posts'::regclass
  ) then
    alter table public.edu_posts
      add constraint edu_posts_media_type_check
      check (media_type in ('image','video','carousel','infographic','resource'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'edu_posts_status_check'
      and conrelid = 'public.edu_posts'::regclass
  ) then
    alter table public.edu_posts
      add constraint edu_posts_status_check
      check (status in ('draft','published','archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'edu_posts_visibility_check'
      and conrelid = 'public.edu_posts'::regclass
  ) then
    alter table public.edu_posts
      add constraint edu_posts_visibility_check
      check (visibility in ('public','connections','private'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'edu_posts_resource_url_check'
      and conrelid = 'public.edu_posts'::regclass
  ) then
    alter table public.edu_posts
      add constraint edu_posts_resource_url_check
      check (
        resource_url is null
        or resource_url ~* '^https?://'
      );
  end if;
end;
$$;

-- 2) Extend comments for better social UX
alter table public.edu_comments
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists parent_comment_id uuid references public.edu_comments(id) on delete cascade;

-- 3) Updated-at triggers
create or replace function public.edu_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_edu_posts_updated_at on public.edu_posts;
create trigger trg_edu_posts_updated_at
before update on public.edu_posts
for each row execute function public.edu_set_updated_at();

drop trigger if exists trg_edu_comments_updated_at on public.edu_comments;
create trigger trg_edu_comments_updated_at
before update on public.edu_comments
for each row execute function public.edu_set_updated_at();

-- 4) Performance indexes
create index if not exists idx_edu_posts_visibility_status_created
  on public.edu_posts (visibility, status, created_at desc, id desc);

create index if not exists idx_edu_posts_search
  on public.edu_posts
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')));

create index if not exists idx_edu_likes_user_post
  on public.edu_likes (user_id, post_id);

create index if not exists idx_edu_saves_user_post
  on public.edu_saves (user_id, post_id);

create index if not exists idx_edu_comments_user_post_created
  on public.edu_comments (user_id, post_id, created_at desc);

create index if not exists idx_edu_comments_parent_created
  on public.edu_comments (parent_comment_id, created_at desc)
  where parent_comment_id is not null;

-- 5) RLS hardening on stats: keep read-only for clients
-- (trigger functions maintain counters)
drop policy if exists "edu_post_stats: service upsert" on public.edu_post_stats;
drop policy if exists "edu_post_stats: service update" on public.edu_post_stats;

-- 6) Notification triggers for post likes and comments
create or replace function public.edu_notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
  actor_name text;
  post_title text;
begin
  select p.user_id, coalesce(nullif(trim(p.title), ''), 'your post')
    into post_owner, post_title
  from public.edu_posts p
  where p.id = new.post_id;

  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(c.display_name), ''), 'A learner')
    into actor_name
  from public.edu_creators c
  where c.user_id = new.user_id;

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
    post_owner,
    'like',
    coalesce(actor_name, 'A learner') || ' liked your post',
    post_title,
    new.user_id,
    'post',
    new.post_id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_edu_notify_post_like on public.edu_likes;
create trigger trg_edu_notify_post_like
after insert on public.edu_likes
for each row execute function public.edu_notify_post_like();

create or replace function public.edu_notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
  actor_name text;
  post_title text;
  comment_preview text;
begin
  select p.user_id, coalesce(nullif(trim(p.title), ''), 'your post')
    into post_owner, post_title
  from public.edu_posts p
  where p.id = new.post_id;

  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(c.display_name), ''), 'A learner')
    into actor_name
  from public.edu_creators c
  where c.user_id = new.user_id;

  comment_preview := left(coalesce(new.body, ''), 180);

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
    post_owner,
    'comment',
    coalesce(actor_name, 'A learner') || ' commented on your post',
    case
      when length(comment_preview) > 0 then comment_preview
      else post_title
    end,
    new.user_id,
    'post',
    new.post_id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_edu_notify_post_comment on public.edu_comments;
create trigger trg_edu_notify_post_comment
after insert on public.edu_comments
for each row execute function public.edu_notify_post_comment();

-- 7) Realtime feed tables (idempotent)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_posts'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_posts';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_comments'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_comments';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_likes'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_likes';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_post_stats'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_post_stats';
    end if;
  end if;
end;
$$;
