-- GreenDuty marketplace dispute + escrow workflow hardening
-- Adds a disputes table and RPC helpers used by buyer/seller/admin flows.

alter table public.marketplace_orders
  drop constraint if exists marketplace_orders_escrow_status_check;

alter table public.marketplace_orders
  add constraint marketplace_orders_escrow_status_check
  check (
    escrow_status in (
      'pending_receipt',
      'funds_held',
      'disputed',
      'released_to_seller',
      'refunded_to_buyer'
    )
  );

create table if not exists public.marketplace_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.marketplace_orders(id) on delete cascade,
  item_id uuid references public.marketplace_items(id) on delete set null,
  buyer_id uuid not null references public.marketplace_profiles(id) on delete cascade,
  seller_id uuid references public.marketplace_profiles(id) on delete set null,
  opened_by uuid not null references public.marketplace_profiles(id) on delete cascade,
  opened_by_role text not null check (opened_by_role in ('buyer', 'seller', 'admin')),
  reason text,
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved')),
  resolution_action text check (resolution_action in ('release_to_seller', 'refund_buyer')),
  resolution_note text,
  resolved_by uuid references public.marketplace_profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_disputes_order_id_idx
  on public.marketplace_disputes (order_id);

create index if not exists marketplace_disputes_status_idx
  on public.marketplace_disputes (status);

create index if not exists marketplace_disputes_updated_at_idx
  on public.marketplace_disputes (updated_at desc);

alter table public.marketplace_disputes enable row level security;

drop policy if exists "Dispute participants can read disputes" on public.marketplace_disputes;
create policy "Dispute participants can read disputes"
  on public.marketplace_disputes
  for select
  using (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
    or auth.uid() = opened_by
    or public.is_marketplace_admin()
  );

drop policy if exists "Admins can update disputes" on public.marketplace_disputes;
create policy "Admins can update disputes"
  on public.marketplace_disputes
  for update
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

create or replace function public.marketplace_open_dispute(
  p_order_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_is_admin boolean := public.is_marketplace_admin();
  v_order public.marketplace_orders%rowtype;
  v_seller_id uuid;
  v_actor_role text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required to open a dispute.';
  end if;

  select o.*
    into v_order
  from public.marketplace_orders o
  where o.id = p_order_id
  limit 1;

  if not found then
    raise exception 'Order not found.';
  end if;

  select i.seller_id
    into v_seller_id
  from public.marketplace_items i
  where i.id = v_order.item_id
  limit 1;

  if v_actor = v_order.buyer_id then
    v_actor_role := 'buyer';
  elsif v_actor = v_seller_id then
    v_actor_role := 'seller';
  elsif v_is_admin then
    v_actor_role := 'admin';
  else
    raise exception 'You are not allowed to open a dispute for this order.';
  end if;

  if coalesce(v_order.escrow_status, 'pending_receipt') in ('released_to_seller', 'refunded_to_buyer')
     and not v_is_admin then
    raise exception 'This order is already closed and cannot be disputed.';
  end if;

  update public.marketplace_orders
  set
    escrow_status = 'disputed',
    status = 'disputed',
    updated_at = now()
  where id = p_order_id;

  insert into public.marketplace_disputes (
    order_id,
    item_id,
    buyer_id,
    seller_id,
    opened_by,
    opened_by_role,
    reason,
    status,
    resolution_action,
    resolution_note,
    resolved_by,
    resolved_at,
    updated_at
  )
  values (
    p_order_id,
    v_order.item_id,
    v_order.buyer_id,
    v_seller_id,
    v_actor,
    v_actor_role,
    v_reason,
    'open',
    null,
    null,
    null,
    null,
    now()
  )
  on conflict (order_id) do update
  set
    opened_by = excluded.opened_by,
    opened_by_role = excluded.opened_by_role,
    reason = coalesce(excluded.reason, public.marketplace_disputes.reason),
    status = 'open',
    resolution_action = null,
    resolution_note = null,
    resolved_by = null,
    resolved_at = null,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'escrow_status', 'disputed',
    'status', 'disputed'
  );
end;
$$;

create or replace function public.marketplace_submit_buyer_receipt(
  p_order_id uuid,
  p_receipt_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.marketplace_orders%rowtype;
  v_receipt text := nullif(trim(coalesce(p_receipt_url, '')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required to submit receipt.';
  end if;

  if v_receipt is null then
    raise exception 'Receipt URL is required.';
  end if;

  select o.*
    into v_order
  from public.marketplace_orders o
  where o.id = p_order_id
  limit 1;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_actor <> v_order.buyer_id then
    raise exception 'Only the buyer can submit a receipt.';
  end if;

  if coalesce(v_order.escrow_status, 'pending_receipt') in ('released_to_seller', 'refunded_to_buyer') then
    raise exception 'This order is already closed.';
  end if;

  if coalesce(v_order.escrow_status, 'pending_receipt') = 'disputed' then
    raise exception 'Order is disputed. Wait for admin review.';
  end if;

  update public.marketplace_orders
  set
    buyer_receipt_url = v_receipt,
    escrow_status = 'pending_receipt',
    updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'escrow_status', 'pending_receipt'
  );
end;
$$;

create or replace function public.marketplace_mark_order_shipped(
  p_order_id uuid,
  p_shipping_proof_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.marketplace_orders%rowtype;
  v_seller_id uuid;
  v_shipping text := nullif(trim(coalesce(p_shipping_proof_url, '')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required to mark shipment.';
  end if;

  if v_shipping is null then
    raise exception 'Shipping proof URL is required.';
  end if;

  select o.*
    into v_order
  from public.marketplace_orders o
  where o.id = p_order_id
  limit 1;

  if not found then
    raise exception 'Order not found.';
  end if;

  select i.seller_id
    into v_seller_id
  from public.marketplace_items i
  where i.id = v_order.item_id
  limit 1;

  if v_actor <> v_seller_id then
    raise exception 'Only the seller can mark shipment.';
  end if;

  if coalesce(v_order.escrow_status, 'pending_receipt') <> 'funds_held' then
    raise exception 'Order must be in funds held state before shipment.';
  end if;

  update public.marketplace_orders
  set
    seller_shipping_proof = v_shipping,
    status = 'shipped',
    updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'status', 'shipped'
  );
end;
$$;

create or replace function public.marketplace_confirm_delivery(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.marketplace_orders%rowtype;
begin
  if v_actor is null then
    raise exception 'Authentication required to confirm delivery.';
  end if;

  select o.*
    into v_order
  from public.marketplace_orders o
  where o.id = p_order_id
  limit 1;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_actor <> v_order.buyer_id then
    raise exception 'Only the buyer can confirm delivery.';
  end if;

  if coalesce(v_order.escrow_status, 'pending_receipt') <> 'funds_held' then
    raise exception 'Order must be in funds held state before confirmation.';
  end if;

  if coalesce(v_order.status, 'pending') <> 'shipped' then
    raise exception 'Order must be marked as shipped first.';
  end if;

  update public.marketplace_orders
  set
    buyer_confirmation = true,
    escrow_status = 'released_to_seller',
    status = 'delivered',
    updated_at = now()
  where id = p_order_id;

  update public.marketplace_disputes
  set
    status = 'resolved',
    resolution_action = 'release_to_seller',
    resolution_note = coalesce(resolution_note, 'Buyer confirmed delivery.'),
    resolved_by = v_actor,
    resolved_at = now(),
    updated_at = now()
  where order_id = p_order_id
    and status <> 'resolved';

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'escrow_status', 'released_to_seller',
    'status', 'delivered'
  );
end;
$$;

create or replace function public.marketplace_admin_set_escrow(
  p_order_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action, '')));
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_order public.marketplace_orders%rowtype;
  v_seller_id uuid;
  v_new_escrow text;
  v_new_status text;
begin
  if v_actor is null then
    raise exception 'Authentication required for admin escrow actions.';
  end if;

  if not public.is_marketplace_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_action not in ('verify_funds', 'release_to_seller', 'refund_buyer', 'mark_disputed') then
    raise exception 'Invalid escrow action: %', v_action;
  end if;

  select o.*
    into v_order
  from public.marketplace_orders o
  where o.id = p_order_id
  limit 1;

  if not found then
    raise exception 'Order not found.';
  end if;

  select i.seller_id
    into v_seller_id
  from public.marketplace_items i
  where i.id = v_order.item_id
  limit 1;

  if v_action = 'verify_funds' then
    if nullif(trim(coalesce(v_order.buyer_receipt_url, '')), '') is null then
      raise exception 'Buyer receipt is required before verifying funds.';
    end if;
    v_new_escrow := 'funds_held';
    v_new_status := case
      when coalesce(v_order.status, 'pending') in ('pending', 'disputed') then 'processing'
      else coalesce(v_order.status, 'processing')
    end;
  elsif v_action = 'release_to_seller' then
    v_new_escrow := 'released_to_seller';
    v_new_status := 'delivered';
  elsif v_action = 'refund_buyer' then
    v_new_escrow := 'refunded_to_buyer';
    v_new_status := 'refunded';
  else
    v_new_escrow := 'disputed';
    v_new_status := 'disputed';
  end if;

  update public.marketplace_orders
  set
    escrow_status = v_new_escrow,
    status = v_new_status,
    buyer_confirmation = case
      when v_new_escrow = 'released_to_seller' then true
      else buyer_confirmation
    end,
    updated_at = now()
  where id = p_order_id;

  if v_action = 'mark_disputed' then
    insert into public.marketplace_disputes (
      order_id,
      item_id,
      buyer_id,
      seller_id,
      opened_by,
      opened_by_role,
      reason,
      status,
      updated_at
    )
    values (
      p_order_id,
      v_order.item_id,
      v_order.buyer_id,
      v_seller_id,
      v_actor,
      'admin',
      coalesce(v_note, 'Dispute opened by admin.'),
      'open',
      now()
    )
    on conflict (order_id) do update
    set
      status = 'open',
      resolution_action = null,
      resolution_note = null,
      resolved_by = null,
      resolved_at = null,
      updated_at = now();
  elsif v_action = 'verify_funds' then
    update public.marketplace_disputes
    set
      status = 'under_review',
      updated_at = now()
    where order_id = p_order_id
      and status <> 'resolved';
  else
    insert into public.marketplace_disputes (
      order_id,
      item_id,
      buyer_id,
      seller_id,
      opened_by,
      opened_by_role,
      reason,
      status,
      resolution_action,
      resolution_note,
      resolved_by,
      resolved_at,
      updated_at
    )
    values (
      p_order_id,
      v_order.item_id,
      v_order.buyer_id,
      v_seller_id,
      v_actor,
      'admin',
      null,
      'resolved',
      case
        when v_action = 'release_to_seller' then 'release_to_seller'
        else 'refund_buyer'
      end,
      v_note,
      v_actor,
      now(),
      now()
    )
    on conflict (order_id) do update
    set
      status = 'resolved',
      resolution_action = case
        when v_action = 'release_to_seller' then 'release_to_seller'
        else 'refund_buyer'
      end,
      resolution_note = coalesce(v_note, public.marketplace_disputes.resolution_note),
      resolved_by = v_actor,
      resolved_at = now(),
      updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'escrow_status', v_new_escrow,
    'status', v_new_status
  );
end;
$$;

revoke all on function public.marketplace_open_dispute(uuid, text) from public;
revoke all on function public.marketplace_submit_buyer_receipt(uuid, text) from public;
revoke all on function public.marketplace_mark_order_shipped(uuid, text) from public;
revoke all on function public.marketplace_confirm_delivery(uuid) from public;
revoke all on function public.marketplace_admin_set_escrow(uuid, text, text) from public;

grant execute on function public.marketplace_open_dispute(uuid, text) to authenticated;
grant execute on function public.marketplace_submit_buyer_receipt(uuid, text) to authenticated;
grant execute on function public.marketplace_mark_order_shipped(uuid, text) to authenticated;
grant execute on function public.marketplace_confirm_delivery(uuid) to authenticated;
grant execute on function public.marketplace_admin_set_escrow(uuid, text, text) to authenticated;

select pg_notify('pgrst', 'reload schema');
