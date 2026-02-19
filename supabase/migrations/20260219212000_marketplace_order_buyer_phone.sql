alter table public.marketplace_orders
  add column if not exists buyer_phone text;
