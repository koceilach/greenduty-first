-- Disable user-side deletion/editing of EDU chat messages.
-- We keep insert/select policies, but remove update policy.

drop policy if exists "Update own messages" on public.messages;
drop policy if exists "Users update own messages" on public.messages;

select pg_notify('pgrst', 'reload schema');
