-- ============================================================
-- Education post reports (moderation queue)
-- ============================================================

create table if not exists public.edu_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.edu_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'action_taken')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create index if not exists idx_edu_post_reports_post_created
  on public.edu_post_reports (post_id, created_at desc);

create index if not exists idx_edu_post_reports_status_created
  on public.edu_post_reports (status, created_at desc);

alter table public.edu_post_reports enable row level security;

drop policy if exists "edu_post_reports: insert own" on public.edu_post_reports;
create policy "edu_post_reports: insert own"
  on public.edu_post_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "edu_post_reports: read own" on public.edu_post_reports;
create policy "edu_post_reports: read own"
  on public.edu_post_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_post_reports'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_post_reports';
    end if;
  end if;
end;
$$;

select pg_notify('pgrst', 'reload schema');
