-- ============================================================
-- Education critical fixes:
-- 1) Enforce post visibility at RLS level
-- 2) Prevent forged cross-user notifications from clients
-- ============================================================

-- Ensure visibility exists everywhere this migration runs.
alter table public.edu_posts
  add column if not exists visibility text not null default 'public';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'edu_posts_visibility_check'
      and conrelid = 'public.edu_posts'::regclass
  ) then
    alter table public.edu_posts
      add constraint edu_posts_visibility_check
      check (visibility in ('public','connections','private'));
  end if;
end;
$$;

-- Safe read policy:
-- - owners always read their own posts
-- - everyone can read only published public posts
drop policy if exists "edu_posts: public read published" on public.edu_posts;
create policy "edu_posts: public read published"
  on public.edu_posts
  for select
  using (
    auth.uid() = user_id
    or (
      status = 'published'
      and coalesce(visibility, 'public') = 'public'
    )
  );

-- Tighten notification inserts:
-- Clients may only insert notifications for themselves.
-- Trigger/service-role inserts remain supported.
drop policy if exists "Insert notifications" on public.notifications;
drop policy if exists "Insert own notifications only" on public.notifications;
create policy "Insert own notifications only"
  on public.notifications
  for insert
  to authenticated
  with check (
    (
      auth.uid() = user_id
      and (actor_id is null or actor_id = auth.uid())
    )
    or auth.role() = 'service_role'
  );

select pg_notify('pgrst', 'reload schema');
