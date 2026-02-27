-- Marketplace Community Forum: posts + comments with strict owner RLS.

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_posts_title_len_check check (char_length(trim(title)) between 3 and 160),
  constraint forum_posts_body_len_check check (char_length(trim(body)) between 3 and 5000)
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_comments_body_len_check check (char_length(trim(body)) between 1 and 2000)
);

create index if not exists forum_posts_created_at_idx
  on public.forum_posts (created_at desc);

create index if not exists forum_posts_user_id_idx
  on public.forum_posts (user_id);

create index if not exists forum_comments_post_id_created_at_idx
  on public.forum_comments (post_id, created_at asc);

create index if not exists forum_comments_user_id_idx
  on public.forum_comments (user_id);

create or replace function public.set_marketplace_forum_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
before update on public.forum_posts
for each row execute function public.set_marketplace_forum_updated_at();

drop trigger if exists forum_comments_set_updated_at on public.forum_comments;
create trigger forum_comments_set_updated_at
before update on public.forum_comments
for each row execute function public.set_marketplace_forum_updated_at();

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;

-- Read access: anyone can read forum content.
drop policy if exists "Forum posts are readable" on public.forum_posts;
create policy "Forum posts are readable"
  on public.forum_posts
  for select
  using (true);

drop policy if exists "Forum comments are readable" on public.forum_comments;
create policy "Forum comments are readable"
  on public.forum_comments
  for select
  using (true);

-- Insert access: authenticated users can create only as themselves.
drop policy if exists "Users can create own forum posts" on public.forum_posts;
create policy "Users can create own forum posts"
  on public.forum_posts
  for insert
  with check (auth.uid() = user_id and auth.uid() is not null);

drop policy if exists "Users can create own forum comments" on public.forum_comments;
create policy "Users can create own forum comments"
  on public.forum_comments
  for insert
  with check (auth.uid() = user_id and auth.uid() is not null);

-- Update/Delete: strict owner-only.
drop policy if exists "Users can update own forum posts" on public.forum_posts;
create policy "Users can update own forum posts"
  on public.forum_posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own forum posts" on public.forum_posts;
create policy "Users can delete own forum posts"
  on public.forum_posts
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update own forum comments" on public.forum_comments;
create policy "Users can update own forum comments"
  on public.forum_comments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own forum comments" on public.forum_comments;
create policy "Users can delete own forum comments"
  on public.forum_comments
  for delete
  using (auth.uid() = user_id);
