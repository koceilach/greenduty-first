-- Enable realtime events for marketplace seller order alerts.
do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'marketplace_orders'
    ) then
      alter publication supabase_realtime add table public.marketplace_orders;
    end if;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
