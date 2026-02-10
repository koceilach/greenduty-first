-- Lock GreenSpot report acceptance to one claimant and expose claim state in feeds.

create table if not exists greenspot.greenspot_report_claims (
  report_id uuid primary key,
  accepted_by_user_id uuid not null references auth.users(id) on delete cascade,
  accepted_by_name text not null,
  created_at timestamptz not null default now()
);

alter table greenspot.greenspot_report_claims
  add column if not exists report_id uuid,
  add column if not exists accepted_by_user_id uuid,
  add column if not exists accepted_by_name text,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_greenspot_report_claims_report_id
  on greenspot.greenspot_report_claims(report_id);

create index if not exists idx_greenspot_report_claims_user
  on greenspot.greenspot_report_claims(accepted_by_user_id, created_at desc);

alter table greenspot.greenspot_report_claims enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_report_claims'
      and policyname = 'GreenSpot report claims select public'
  ) then
    create policy "GreenSpot report claims select public"
      on greenspot.greenspot_report_claims
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_report_claims'
      and policyname = 'GreenSpot report claims insert own'
  ) then
    create policy "GreenSpot report claims insert own"
      on greenspot.greenspot_report_claims
      for insert
      to authenticated
      with check (auth.uid() = accepted_by_user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'greenspot'
      and tablename = 'greenspot_report_claims'
      and policyname = 'GreenSpot report claims delete own or admin'
  ) then
    create policy "GreenSpot report claims delete own or admin"
      on greenspot.greenspot_report_claims
      for delete
      to authenticated
      using (auth.uid() = accepted_by_user_id or greenspot.is_admin(auth.uid()));
  end if;
end $$;

grant select on table greenspot.greenspot_report_claims to anon;
grant select, insert, delete on table greenspot.greenspot_report_claims to authenticated;

select pg_notify('pgrst', 'reload schema');
