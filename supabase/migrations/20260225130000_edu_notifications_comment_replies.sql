-- ============================================================
-- Education notifications + threaded comment replies
-- ============================================================

-- 1) Ensure threaded comments column exists for reply UX
alter table public.edu_comments
  add column if not exists parent_comment_id uuid references public.edu_comments(id) on delete cascade;

create index if not exists idx_edu_comments_parent_created
  on public.edu_comments (parent_comment_id, created_at desc)
  where parent_comment_id is not null;

-- 2) Expand notifications enums/checks for new social types
--    Keep this idempotent across environments that may have different constraint names.
do $$
declare
  r record;
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
declare
  r record;
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
    resource_type in ('post', 'comment', 'conversation', 'profile', 'story')
    or resource_type is null
  );

create index if not exists idx_notifications_user_type_created
  on public.notifications (user_id, type, created_at desc);

-- 3) Story repost table + trigger-backed notifications
create table if not exists public.edu_story_reposts (
  post_id uuid not null references public.edu_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_edu_story_reposts_user_created
  on public.edu_story_reposts (user_id, created_at desc);

alter table public.edu_story_reposts enable row level security;

drop policy if exists "edu_story_reposts: public read" on public.edu_story_reposts;
create policy "edu_story_reposts: public read"
  on public.edu_story_reposts
  for select
  using (true);

drop policy if exists "edu_story_reposts: auth insert own" on public.edu_story_reposts;
create policy "edu_story_reposts: auth insert own"
  on public.edu_story_reposts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create or replace function public.edu_notify_story_repost()
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

  select coalesce(
      nullif(trim(ec.display_name), ''),
      nullif(trim(pr.full_name), ''),
      nullif(trim(pr.username), ''),
      'A learner'
    )
    into actor_name
  from public.profiles pr
  left join public.edu_creators ec on ec.user_id = pr.id
  where pr.id = new.user_id;

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
    'repost_story',
    coalesce(actor_name, 'A learner') || ' reposted your post to story',
    post_title,
    new.user_id,
    'post',
    new.post_id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_edu_notify_story_repost on public.edu_story_reposts;
create trigger trg_edu_notify_story_repost
after insert on public.edu_story_reposts
for each row execute function public.edu_notify_story_repost();

-- 4) Notification trigger for comments + replies
create or replace function public.edu_notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
  parent_comment_owner uuid;
  actor_name text;
  post_title text;
  comment_preview text;
begin
  select p.user_id, coalesce(nullif(trim(p.title), ''), 'your post')
    into post_owner, post_title
  from public.edu_posts p
  where p.id = new.post_id;

  if new.parent_comment_id is not null then
    select c.user_id
      into parent_comment_owner
    from public.edu_comments c
    where c.id = new.parent_comment_id;
  end if;

  select coalesce(
      nullif(trim(ec.display_name), ''),
      nullif(trim(pr.full_name), ''),
      nullif(trim(pr.username), ''),
      'A learner'
    )
    into actor_name
  from public.profiles pr
  left join public.edu_creators ec on ec.user_id = pr.id
  where pr.id = new.user_id;

  comment_preview := left(coalesce(nullif(trim(new.body), ''), post_title), 180);

  -- Reply notification (Instagram-like)
  if new.parent_comment_id is not null then
    if parent_comment_owner is not null and parent_comment_owner <> new.user_id then
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
        parent_comment_owner,
        'comment_reply',
        coalesce(actor_name, 'A learner') || ' replied to your comment',
        comment_preview,
        new.user_id,
        'comment',
        new.id::text
      );
    end if;

    -- Also notify post owner if reply came from another user and owner is not already notified above.
    if post_owner is not null
       and post_owner <> new.user_id
       and (parent_comment_owner is null or post_owner <> parent_comment_owner) then
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
        comment_preview,
        new.user_id,
        'post',
        new.post_id::text
      );
    end if;

    return new;
  end if;

  -- Top-level comment notification
  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;

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
    comment_preview,
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

-- 5) Notification trigger for incoming chat messages
create or replace function public.edu_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  preview text;
begin
  if new.sender_id is null then
    return new;
  end if;

  if new.message_type = 'system' then
    return new;
  end if;

  select coalesce(
      nullif(trim(ec.display_name), ''),
      nullif(trim(pr.full_name), ''),
      nullif(trim(pr.username), ''),
      'Someone'
    )
    into actor_name
  from public.profiles pr
  left join public.edu_creators ec on ec.user_id = pr.id
  where pr.id = new.sender_id;

  preview := case
    when new.message_type = 'image' then 'sent a photo'
    when new.message_type = 'voice' then 'sent a voice message'
    else left(coalesce(nullif(trim(new.content), ''), 'Message'), 180)
  end;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    actor_id,
    resource_type,
    resource_id
  )
  select
    cp.user_id,
    'message',
    coalesce(actor_name, 'Someone') || ' sent you a message',
    preview,
    new.sender_id,
    'conversation',
    new.conversation_id::text
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists trg_edu_notify_message on public.messages;
create trigger trg_edu_notify_message
after insert on public.messages
for each row execute function public.edu_notify_new_message();
