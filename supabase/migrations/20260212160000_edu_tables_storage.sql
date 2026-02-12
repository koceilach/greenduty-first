-- ============================================================
-- Education module: tables, storage bucket, RLS, triggers, seeds
-- ============================================================

-- 1. edu_categories
create table if not exists public.edu_categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.edu_categories enable row level security;

create policy "edu_categories: public read"
  on public.edu_categories for select
  using (true);

create policy "edu_categories: auth insert"
  on public.edu_categories for insert
  to authenticated with check (true);

-- 2. edu_creators
create table if not exists public.edu_creators (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  display_name    text not null default 'Anonymous',
  handle          text,
  verified        boolean not null default false,
  avatar_url      text,
  cover_url       text,
  about_media_urls text[],
  expertise       text[],
  created_at      timestamptz not null default now(),
  unique (user_id)
);

alter table public.edu_creators enable row level security;

create policy "edu_creators: public read"
  on public.edu_creators for select
  using (true);

create policy "edu_creators: owner insert"
  on public.edu_creators for insert
  to authenticated with check (auth.uid() = user_id);

create policy "edu_creators: owner update"
  on public.edu_creators for update
  to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. edu_posts
create table if not exists public.edu_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  creator_id  uuid references public.edu_creators(id) on delete set null,
  title       text not null,
  body        text,
  category_id uuid references public.edu_categories(id) on delete set null,
  media_type  text not null default 'image',
  media_urls  text[],
  hashtags    text[],
  sources     text[],
  status      text not null default 'published',
  created_at  timestamptz not null default now()
);

create index idx_edu_posts_status_created on public.edu_posts (status, created_at desc, id desc);
create index idx_edu_posts_user on public.edu_posts (user_id);
create index idx_edu_posts_creator on public.edu_posts (creator_id);
create index idx_edu_posts_category on public.edu_posts (category_id);

alter table public.edu_posts enable row level security;

create policy "edu_posts: public read published"
  on public.edu_posts for select
  using (status = 'published' or auth.uid() = user_id);

create policy "edu_posts: auth insert"
  on public.edu_posts for insert
  to authenticated with check (auth.uid() = user_id);

create policy "edu_posts: owner update"
  on public.edu_posts for update
  to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "edu_posts: owner delete"
  on public.edu_posts for delete
  to authenticated using (auth.uid() = user_id);

-- 4. edu_likes
create table if not exists public.edu_likes (
  post_id uuid not null references public.edu_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.edu_likes enable row level security;

create policy "edu_likes: public read"
  on public.edu_likes for select
  using (true);

create policy "edu_likes: auth insert"
  on public.edu_likes for insert
  to authenticated with check (auth.uid() = user_id);

create policy "edu_likes: owner delete"
  on public.edu_likes for delete
  to authenticated using (auth.uid() = user_id);

-- 5. edu_saves
create table if not exists public.edu_saves (
  post_id uuid not null references public.edu_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.edu_saves enable row level security;

create policy "edu_saves: public read"
  on public.edu_saves for select
  using (true);

create policy "edu_saves: auth insert"
  on public.edu_saves for insert
  to authenticated with check (auth.uid() = user_id);

create policy "edu_saves: owner delete"
  on public.edu_saves for delete
  to authenticated using (auth.uid() = user_id);

-- 6. edu_comments
create table if not exists public.edu_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.edu_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index idx_edu_comments_post on public.edu_comments (post_id, created_at desc);

alter table public.edu_comments enable row level security;

create policy "edu_comments: public read"
  on public.edu_comments for select
  using (true);

create policy "edu_comments: auth insert"
  on public.edu_comments for insert
  to authenticated with check (auth.uid() = user_id);

create policy "edu_comments: owner delete"
  on public.edu_comments for delete
  to authenticated using (auth.uid() = user_id);

-- 7. edu_comment_likes
create table if not exists public.edu_comment_likes (
  comment_id uuid not null references public.edu_comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.edu_comment_likes enable row level security;

create policy "edu_comment_likes: public read"
  on public.edu_comment_likes for select
  using (true);

create policy "edu_comment_likes: auth insert"
  on public.edu_comment_likes for insert
  to authenticated with check (auth.uid() = user_id);

create policy "edu_comment_likes: owner delete"
  on public.edu_comment_likes for delete
  to authenticated using (auth.uid() = user_id);

-- 8. edu_post_stats (materialised counts)
create table if not exists public.edu_post_stats (
  post_id  uuid primary key references public.edu_posts(id) on delete cascade,
  likes    integer not null default 0,
  saves    integer not null default 0,
  comments integer not null default 0
);

alter table public.edu_post_stats enable row level security;

create policy "edu_post_stats: public read"
  on public.edu_post_stats for select
  using (true);

-- allow triggers (executed as the invoker) to write stats
create policy "edu_post_stats: service upsert"
  on public.edu_post_stats for insert
  to authenticated with check (true);

create policy "edu_post_stats: service update"
  on public.edu_post_stats for update
  to authenticated using (true) with check (true);

-- 9. edu_ai_verifications
create table if not exists public.edu_ai_verifications (
  post_id             uuid primary key references public.edu_posts(id) on delete cascade,
  status              text,
  accuracy            numeric,
  source_credibility  numeric,
  greenwashing_risk   text,
  risk_flags          text[],
  sources             text[],
  notes               text,
  verified_at         timestamptz
);

alter table public.edu_ai_verifications enable row level security;

create policy "edu_ai_verifications: public read"
  on public.edu_ai_verifications for select
  using (true);

create policy "edu_ai_verifications: service insert"
  on public.edu_ai_verifications for insert
  to authenticated with check (true);

create policy "edu_ai_verifications: service update"
  on public.edu_ai_verifications for update
  to authenticated using (true) with check (true);

-- ============================================================
-- Triggers: keep edu_post_stats in sync
-- ============================================================

-- helper: ensure a stats row exists for a post
create or replace function public.edu_ensure_post_stats(p_post_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.edu_post_stats (post_id)
  values (p_post_id)
  on conflict (post_id) do nothing;
end;
$$;

-- auto-create stats row when a post is inserted
create or replace function public.edu_post_insert_stats()
returns trigger language plpgsql security definer as $$
begin
  perform public.edu_ensure_post_stats(NEW.id);
  return NEW;
end;
$$;

create trigger trg_edu_post_insert_stats
  after insert on public.edu_posts
  for each row execute function public.edu_post_insert_stats();

-- likes counter
create or replace function public.edu_likes_counter()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    perform public.edu_ensure_post_stats(NEW.post_id);
    update public.edu_post_stats set likes = likes + 1 where post_id = NEW.post_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.edu_post_stats set likes = greatest(likes - 1, 0) where post_id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_edu_likes_counter
  after insert or delete on public.edu_likes
  for each row execute function public.edu_likes_counter();

-- saves counter
create or replace function public.edu_saves_counter()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    perform public.edu_ensure_post_stats(NEW.post_id);
    update public.edu_post_stats set saves = saves + 1 where post_id = NEW.post_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.edu_post_stats set saves = greatest(saves - 1, 0) where post_id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_edu_saves_counter
  after insert or delete on public.edu_saves
  for each row execute function public.edu_saves_counter();

-- comments counter
create or replace function public.edu_comments_counter()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    perform public.edu_ensure_post_stats(NEW.post_id);
    update public.edu_post_stats set comments = comments + 1 where post_id = NEW.post_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.edu_post_stats set comments = greatest(comments - 1, 0) where post_id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_edu_comments_counter
  after insert or delete on public.edu_comments
  for each row execute function public.edu_comments_counter();

-- ============================================================
-- Storage bucket: edu-media
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'edu-media',
  'edu-media',
  true,
  10485760, -- 10 MB
  array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm']
)
on conflict (id) do nothing;

-- Anyone can read (public bucket)
create policy "edu-media: public read"
  on storage.objects for select
  using (bucket_id = 'edu-media');

-- Authenticated users can upload
create policy "edu-media: auth upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'edu-media');

-- Users can update their own objects
create policy "edu-media: owner update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'edu-media' and (storage.foldername(name))[1] = 'edu-posts' and (storage.foldername(name))[2] = auth.uid()::text);

-- Users can delete their own objects
create policy "edu-media: owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'edu-media' and (storage.foldername(name))[1] = 'edu-posts' and (storage.foldername(name))[2] = auth.uid()::text);

-- ============================================================
-- Seed categories
-- ============================================================

insert into public.edu_categories (name) values
  ('Agronomy'),
  ('Climate'),
  ('Soil'),
  ('Water')
on conflict (name) do nothing;
