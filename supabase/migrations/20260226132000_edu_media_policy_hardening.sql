-- ============================================================
-- Education media storage policy hardening
-- ============================================================

-- Replace permissive upload policy with owner-folder enforcement.
drop policy if exists "edu-media: auth upload" on storage.objects;
drop policy if exists "edu-media: auth upload own folder" on storage.objects;

create policy "edu-media: auth upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'edu-media'
    and (storage.foldername(name))[1] = 'edu-posts'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

select pg_notify('pgrst', 'reload schema');
