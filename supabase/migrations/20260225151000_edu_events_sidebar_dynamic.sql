-- ============================================================
-- Education events (dynamic sidebar source)
-- ============================================================

create table if not exists public.edu_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_edu_events_status_starts
  on public.edu_events (status, starts_at asc);

alter table public.edu_events enable row level security;

drop policy if exists "edu_events: public read" on public.edu_events;
create policy "edu_events: public read"
  on public.edu_events
  for select
  using (true);

drop policy if exists "edu_events: auth insert" on public.edu_events;
create policy "edu_events: auth insert"
  on public.edu_events
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "edu_events: owner update" on public.edu_events;
create policy "edu_events: owner update"
  on public.edu_events
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "edu_events: owner delete" on public.edu_events;
create policy "edu_events: owner delete"
  on public.edu_events
  for delete
  to authenticated
  using (created_by = auth.uid());

insert into public.edu_events (title, details, starts_at, ends_at, location, status, created_by)
select
  'Soil Health Live Session',
  'Practical workshop on soil resilience and water retention.',
  now() + interval '4 days',
  now() + interval '4 days 2 hours',
  'GreenDuty Learning Hub',
  'upcoming',
  null
where not exists (
  select 1 from public.edu_events where lower(title) = lower('Soil Health Live Session')
);

insert into public.edu_events (title, details, starts_at, ends_at, location, status, created_by)
select
  'Reels Storytelling Sprint',
  'How to create concise educational reels that convert viewers to learners.',
  now() + interval '8 days',
  now() + interval '8 days 90 minutes',
  'Online',
  'upcoming',
  null
where not exists (
  select 1 from public.edu_events where lower(title) = lower('Reels Storytelling Sprint')
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'edu_events'
    ) then
      execute 'alter publication supabase_realtime add table public.edu_events';
    end if;
  end if;
end;
$$;

select pg_notify('pgrst', 'reload schema');
