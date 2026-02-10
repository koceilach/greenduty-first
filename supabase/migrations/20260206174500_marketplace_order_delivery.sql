alter table public.marketplace_orders
  add column if not exists buyer_first_name text,
  add column if not exists buyer_last_name text,
  add column if not exists delivery_address text,
  add column if not exists delivery_location text,
  add column if not exists delivery_fee_dzd numeric(10, 2) default 0;
