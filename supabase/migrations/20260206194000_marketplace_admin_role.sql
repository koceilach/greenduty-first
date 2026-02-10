-- GreenDuty Admin Role + Escrow Oversight Policies

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'seller', 'admin'));

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='marketplace_orders'
      and policyname='Admins can read all orders'
  ) then
    create policy "Admins can read all orders"
      on public.marketplace_orders
      for select
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='marketplace_orders'
      and policyname='Admins can update all orders'
  ) then
    create policy "Admins can update all orders"
      on public.marketplace_orders
      for update
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end$$;
