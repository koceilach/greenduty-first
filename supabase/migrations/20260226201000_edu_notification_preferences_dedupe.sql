-- ============================================================
-- Education notification quality:
-- per-type mute preferences + server-side dedupe helper
-- ============================================================

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mute_like boolean not null default false,
  mute_comment boolean not null default false,
  mute_comment_reply boolean not null default false,
  mute_follow boolean not null default false,
  mute_message boolean not null default false,
  mute_mention boolean not null default false,
  mute_repost_story boolean not null default false,
  mute_system boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences: read own" on public.notification_preferences;
create policy "notification_preferences: read own"
  on public.notification_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notification_preferences: insert own" on public.notification_preferences;
create policy "notification_preferences: insert own"
  on public.notification_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences: update own" on public.notification_preferences;
create policy "notification_preferences: update own"
  on public.notification_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.notification_preferences_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.notification_preferences_set_updated_at();

create or replace function public.edu_notification_type_is_muted(
  p_user_id uuid,
  p_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pref public.notification_preferences%rowtype;
  v_type text := lower(coalesce(trim(p_type), ''));
begin
  if p_user_id is null then
    return false;
  end if;

  select *
    into v_pref
  from public.notification_preferences
  where user_id = p_user_id;

  if not found then
    return false;
  end if;

  case v_type
    when 'like' then return v_pref.mute_like;
    when 'comment' then return v_pref.mute_comment;
    when 'comment_reply' then return v_pref.mute_comment_reply;
    when 'follow' then return v_pref.mute_follow;
    when 'message' then return v_pref.mute_message;
    when 'mention' then return v_pref.mute_mention;
    when 'repost_story' then return v_pref.mute_repost_story;
    when 'system' then return v_pref.mute_system;
    else return false;
  end case;
end;
$$;

revoke all on function public.edu_notification_type_is_muted(uuid, text) from public;
grant execute on function public.edu_notification_type_is_muted(uuid, text) to authenticated;

create or replace function public.edu_insert_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default '',
  p_actor_id uuid default null,
  p_resource_type text default null,
  p_resource_id text default null,
  p_dedupe_window_seconds integer default 300
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_existing uuid;
  v_created uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  if p_actor_id is not null and p_actor_id = p_user_id then
    return null;
  end if;

  if public.edu_notification_type_is_muted(p_user_id, p_type) then
    return null;
  end if;

  if coalesce(p_dedupe_window_seconds, 0) > 0 then
    select n.id
      into v_existing
    from public.notifications n
    where n.user_id = p_user_id
      and n.type = lower(p_type)
      and n.actor_id is not distinct from p_actor_id
      and n.resource_type is not distinct from p_resource_type
      and n.resource_id is not distinct from p_resource_id
      and n.created_at >= v_now - make_interval(secs => p_dedupe_window_seconds)
    order by n.created_at desc
    limit 1;

    if v_existing is not null then
      update public.notifications
      set
        title = p_title,
        body = coalesce(p_body, ''),
        read = false,
        created_at = v_now
      where id = v_existing;

      return v_existing;
    end if;
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
    p_user_id,
    lower(p_type),
    p_title,
    coalesce(p_body, ''),
    p_actor_id,
    p_resource_type,
    p_resource_id
  )
  returning id into v_created;

  return v_created;
end;
$$;

revoke all on function public.edu_insert_notification(uuid, text, text, text, uuid, text, text, integer) from public;
grant execute on function public.edu_insert_notification(uuid, text, text, text, uuid, text, text, integer) to authenticated;

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

  perform public.edu_insert_notification(
    post_owner,
    'like',
    coalesce(actor_name, 'A learner') || ' liked your post',
    post_title,
    new.user_id,
    'post',
    new.post_id::text,
    600
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

  if new.parent_comment_id is not null then
    if parent_comment_owner is not null and parent_comment_owner <> new.user_id then
      perform public.edu_insert_notification(
        parent_comment_owner,
        'comment_reply',
        coalesce(actor_name, 'A learner') || ' replied to your comment',
        comment_preview,
        new.user_id,
        'comment',
        new.id::text,
        420
      );
    end if;

    if post_owner is not null
       and post_owner <> new.user_id
       and (parent_comment_owner is null or post_owner <> parent_comment_owner) then
      perform public.edu_insert_notification(
        post_owner,
        'comment',
        coalesce(actor_name, 'A learner') || ' commented on your post',
        comment_preview,
        new.user_id,
        'post',
        new.post_id::text,
        420
      );
    end if;

    return new;
  end if;

  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;

  perform public.edu_insert_notification(
    post_owner,
    'comment',
    coalesce(actor_name, 'A learner') || ' commented on your post',
    comment_preview,
    new.user_id,
    'post',
    new.post_id::text,
    420
  );

  return new;
end;
$$;

drop trigger if exists trg_edu_notify_post_comment on public.edu_comments;
create trigger trg_edu_notify_post_comment
after insert on public.edu_comments
for each row execute function public.edu_notify_post_comment();

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

  perform public.edu_insert_notification(
    post_owner,
    'repost_story',
    coalesce(actor_name, 'A learner') || ' reposted your post to story',
    post_title,
    new.user_id,
    'post',
    new.post_id::text,
    600
  );

  return new;
end;
$$;

drop trigger if exists trg_edu_notify_story_repost on public.edu_story_reposts;
create trigger trg_edu_notify_story_repost
after insert on public.edu_story_reposts
for each row execute function public.edu_notify_story_repost();

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

  perform public.edu_insert_notification(
    cp.user_id,
    'message',
    coalesce(actor_name, 'Someone') || ' sent you a message',
    preview,
    new.sender_id,
    'conversation',
    new.conversation_id::text,
    20
  )
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

select pg_notify('pgrst', 'reload schema');
