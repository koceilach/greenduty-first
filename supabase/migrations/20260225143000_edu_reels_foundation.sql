-- ============================================================
-- Education Reels foundation (schema + storage + RLS)
-- ============================================================

create table if not exists public.edu_reels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  video_url text not null,
  caption text not null default '',
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'edu_reels_video_url_check'
      and conrelid = 'public.edu_reels'::regclass
  ) then
    alter table public.edu_reels
      add constraint edu_reels_video_url_check
      check (
        video_url ~* '^https?://'
        and (
          position('/storage/v1/object/' in video_url) > 0
          or position('/object/public/edu-reels/' in video_url) > 0
        )
      );
  end if;
end;
$$;

create table if not exists public.edu_reel_likes (
  reel_id uuid not null references public.edu_reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

create index if not exists idx_edu_reels_created_desc
  on public.edu_reels (created_at desc, id desc);

create index if not exists idx_edu_reels_author_created
  on public.edu_reels (author_id, created_at desc);

create index if not exists idx_edu_reel_likes_user_created
  on public.edu_reel_likes (user_id, created_at desc);

alter table public.edu_reels enable row level security;
alter table public.edu_reel_likes enable row level security;

drop policy if exists "edu_reels: public read" on public.edu_reels;
create policy "edu_reels: public read"
  on public.edu_reels
  for select
  using (true);

drop policy if exists "edu_reels: auth insert own" on public.edu_reels;
create policy "edu_reels: auth insert own"
  on public.edu_reels
  for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "edu_reels: owner update" on public.edu_reels;
create policy "edu_reels: owner update"
  on public.edu_reels
  for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "edu_reels: owner delete" on public.edu_reels;
create policy "edu_reels: owner delete"
  on public.edu_reels
  for delete
  to authenticated
  using (auth.uid() = author_id);

drop policy if exists "edu_reel_likes: public read" on public.edu_reel_likes;
create policy "edu_reel_likes: public read"
  on public.edu_reel_likes
  for select
  using (true);

drop policy if exists "edu_reel_likes: auth insert own" on public.edu_reel_likes;
create policy "edu_reel_likes: auth insert own"
  on public.edu_reel_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "edu_reel_likes: owner delete" on public.edu_reel_likes;
create policy "edu_reel_likes: owner delete"
  on public.edu_reel_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.edu_reels_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_edu_reels_updated_at on public.edu_reels;
create trigger trg_edu_reels_updated_at
before update on public.edu_reels
for each row execute function public.edu_reels_set_updated_at();

create or replace function public.edu_reels_likes_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.edu_reels
    set likes_count = likes_count + 1
    where id = new.reel_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.edu_reels
    set likes_count = greatest(likes_count - 1, 0)
    where id = old.reel_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_edu_reels_likes_counter on public.edu_reel_likes;
create trigger trg_edu_reels_likes_counter
after insert or delete on public.edu_reel_likes
for each row execute function public.edu_reels_likes_counter();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'edu-reels',
  'edu-reels',
  true,
  52428800,
  array['video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;

drop policy if exists "edu-reels: public read" on storage.objects;
create policy "edu-reels: public read"
  on storage.objects for select
  using (bucket_id = 'edu-reels');

drop policy if exists "edu-reels: auth upload own folder" on storage.objects;
create policy "edu-reels: auth upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'edu-reels'
    and (storage.foldername(name))[1] = 'reels'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "edu-reels: owner update" on storage.objects;
create policy "edu-reels: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'edu-reels'
    and (storage.foldername(name))[1] = 'reels'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "edu-reels: owner delete" on storage.objects;
create policy "edu-reels: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'edu-reels'
    and (storage.foldername(name))[1] = 'reels'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_reels'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_reels';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_reel_likes'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_reel_likes';
    end if;
  end if;
end;
$$;

select pg_notify('pgrst', 'reload schema');
