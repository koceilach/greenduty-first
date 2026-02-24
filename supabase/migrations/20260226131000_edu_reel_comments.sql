-- ============================================================
-- Education reels comments (schema + RLS + counters + realtime)
-- ============================================================

create table if not exists public.edu_reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.edu_reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'edu_reel_comments_body_check'
      and conrelid = 'public.edu_reel_comments'::regclass
  ) then
    alter table public.edu_reel_comments
      add constraint edu_reel_comments_body_check
      check (length(trim(body)) > 0);
  end if;
end;
$$;

create index if not exists idx_edu_reel_comments_reel_created
  on public.edu_reel_comments (reel_id, created_at desc);

create index if not exists idx_edu_reel_comments_user_created
  on public.edu_reel_comments (user_id, created_at desc);

alter table public.edu_reel_comments enable row level security;

drop policy if exists "edu_reel_comments: public read" on public.edu_reel_comments;
create policy "edu_reel_comments: public read"
  on public.edu_reel_comments
  for select
  using (true);

drop policy if exists "edu_reel_comments: auth insert own" on public.edu_reel_comments;
create policy "edu_reel_comments: auth insert own"
  on public.edu_reel_comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "edu_reel_comments: owner update" on public.edu_reel_comments;
create policy "edu_reel_comments: owner update"
  on public.edu_reel_comments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "edu_reel_comments: owner delete" on public.edu_reel_comments;
create policy "edu_reel_comments: owner delete"
  on public.edu_reel_comments
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.edu_reel_comments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_edu_reel_comments_updated_at on public.edu_reel_comments;
create trigger trg_edu_reel_comments_updated_at
before update on public.edu_reel_comments
for each row execute function public.edu_reel_comments_set_updated_at();

create or replace function public.edu_reels_comments_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.edu_reels
    set comments_count = comments_count + 1
    where id = new.reel_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.edu_reels
    set comments_count = greatest(comments_count - 1, 0)
    where id = old.reel_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_edu_reels_comments_counter on public.edu_reel_comments;
create trigger trg_edu_reels_comments_counter
after insert or delete on public.edu_reel_comments
for each row execute function public.edu_reels_comments_counter();

-- Optional engagement harvest when user_interactions table exists.
create or replace function public.edu_log_reel_comment_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.user_interactions') is not null then
    execute 'insert into public.user_interactions (user_id, reel_id, interaction_type, watch_time_seconds) values ($1, $2, $3, $4)'
      using new.user_id, new.reel_id, 'comment', 0;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_edu_log_reel_comment_interaction on public.edu_reel_comments;
create trigger trg_edu_log_reel_comment_interaction
after insert on public.edu_reel_comments
for each row execute function public.edu_log_reel_comment_interaction();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_reel_comments'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_reel_comments';
    end if;
  end if;
end;
$$;

select pg_notify('pgrst', 'reload schema');
