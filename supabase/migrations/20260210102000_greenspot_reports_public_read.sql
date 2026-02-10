-- Allow the public GreenSpot landing experience to render recent reports.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'greenspot'
      and table_name = 'greenspot_reports'
  ) and not exists (
    select 1
    from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_reports'
      and policyname = 'GreenSpot reports select public'
  ) then
    create policy "GreenSpot reports select public"
      on greenspot.greenspot_reports
      for select
      to public
      using (true);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'greenspot_reports'
  ) and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'greenspot_reports'
      and policyname = 'GreenSpot legacy reports select public'
  ) then
    create policy "GreenSpot legacy reports select public"
      on public.greenspot_reports
      for select
      to public
      using (true);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'greenspot'
      and table_name = 'greenspot_reports'
  ) then
    grant select on table greenspot.greenspot_reports to anon;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'greenspot_reports'
  ) then
    grant select on table public.greenspot_reports to anon;
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
