-- GreenDuty Marketplace Escrow System
-- Adds escrow tracking fields + policies for buyer/seller updates

alter table public.marketplace_orders
  add column if not exists escrow_status text not null default 'pending_receipt',
  add column if not exists buyer_confirmation boolean not null default false,
  add column if not exists seller_shipping_proof text,
  add column if not exists buyer_receipt_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_orders_escrow_status_check'
  ) then
    alter table public.marketplace_orders
      add constraint marketplace_orders_escrow_status_check
      check (
        escrow_status in (
          'pending_receipt',
          'funds_held',
          'disputed',
          'released_to_seller'
        )
      );
  end if;
end$$;

create index if not exists marketplace_orders_escrow_status_idx
  on public.marketplace_orders (escrow_status);

-- Update policies for escrow workflow
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='marketplace_orders'
      and policyname='Buyers can update escrow fields'
  ) then
    create policy "Buyers can update escrow fields"
      on public.marketplace_orders
      for update
      using (
        auth.uid() = buyer_id
        and escrow_status in ('pending_receipt', 'funds_held', 'disputed')
      )
      with check (
        auth.uid() = buyer_id
        and escrow_status in ('pending_receipt', 'released_to_seller', 'disputed')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='marketplace_orders'
      and policyname='Sellers can update shipping proof'
  ) then
    create policy "Sellers can update shipping proof"
      on public.marketplace_orders
      for update
      using (
        exists (
          select 1
          from public.marketplace_items i
          where i.id = item_id and i.seller_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.marketplace_items i
          where i.id = item_id and i.seller_id = auth.uid()
        )
      );
  end if;
end$$;
