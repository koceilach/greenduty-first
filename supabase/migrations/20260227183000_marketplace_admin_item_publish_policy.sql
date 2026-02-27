-- Allow marketplace admins to publish and manage their own listings.
-- This aligns DB RLS with frontend behavior where admin can enter seller mode.

drop policy if exists "Sellers can insert their items" on public.marketplace_items;
create policy "Sellers can insert their items"
  on public.marketplace_items
  for insert
  with check (
    auth.uid() = seller_id
    and exists (
      select 1
      from public.marketplace_profiles mp
      where mp.id = auth.uid()
        and mp.role in ('seller', 'admin')
    )
  );

drop policy if exists "Sellers can update their items" on public.marketplace_items;
create policy "Sellers can update their items"
  on public.marketplace_items
  for update
  using (
    auth.uid() = seller_id
    and exists (
      select 1
      from public.marketplace_profiles mp
      where mp.id = auth.uid()
        and mp.role in ('seller', 'admin')
    )
  )
  with check (
    auth.uid() = seller_id
    and exists (
      select 1
      from public.marketplace_profiles mp
      where mp.id = auth.uid()
        and mp.role in ('seller', 'admin')
    )
  );

drop policy if exists "Sellers can delete their items" on public.marketplace_items;
create policy "Sellers can delete their items"
  on public.marketplace_items
  for delete
  using (
    auth.uid() = seller_id
    and exists (
      select 1
      from public.marketplace_profiles mp
      where mp.id = auth.uid()
        and mp.role in ('seller', 'admin')
    )
  );
