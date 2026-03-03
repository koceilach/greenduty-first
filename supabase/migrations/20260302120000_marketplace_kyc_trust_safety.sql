-- GreenDuty Marketplace KYC: requests table + verified flag + secure storage policies
-- Safe to run multiple times.

-- 1) Status enum for KYC workflow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'marketplace_kyc_status'
  ) THEN
    CREATE TYPE public.marketplace_kyc_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END
$$;

-- 2) KYC requests table
CREATE TABLE IF NOT EXISTS public.kyc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.marketplace_profiles(id) ON DELETE CASCADE,
  status public.marketplace_kyc_status NOT NULL DEFAULT 'pending',
  document_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_requests_user_id_idx
  ON public.kyc_requests (user_id);

CREATE INDEX IF NOT EXISTS kyc_requests_status_idx
  ON public.kyc_requests (status);

-- Optional safety: only one pending request per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS kyc_requests_one_pending_per_user_idx
  ON public.kyc_requests (user_id)
  WHERE status = 'pending';

-- 3) Verification flag on marketplace profiles
ALTER TABLE IF EXISTS public.marketplace_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 4) RLS for kyc_requests
ALTER TABLE public.kyc_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KYC: users read own requests" ON public.kyc_requests;
CREATE POLICY "KYC: users read own requests"
  ON public.kyc_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "KYC: users submit own requests" ON public.kyc_requests;
CREATE POLICY "KYC: users submit own requests"
  ON public.kyc_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "KYC: admins read all requests" ON public.kyc_requests;
CREATE POLICY "KYC: admins read all requests"
  ON public.kyc_requests
  FOR SELECT
  USING (public.is_marketplace_admin());

DROP POLICY IF EXISTS "KYC: admins update all requests" ON public.kyc_requests;
CREATE POLICY "KYC: admins update all requests"
  ON public.kyc_requests
  FOR UPDATE
  USING (public.is_marketplace_admin())
  WITH CHECK (public.is_marketplace_admin());

-- 5) Private storage bucket for KYC files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6) Storage RLS for kyc-documents
DROP POLICY IF EXISTS "KYC docs: owner read" ON storage.objects;
CREATE POLICY "KYC docs: owner read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "KYC docs: owner insert" ON storage.objects;
CREATE POLICY "KYC docs: owner insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "KYC docs: owner update" ON storage.objects;
CREATE POLICY "KYC docs: owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "KYC docs: owner delete" ON storage.objects;
CREATE POLICY "KYC docs: owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "KYC docs: admin read all" ON storage.objects;
CREATE POLICY "KYC docs: admin read all"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.is_marketplace_admin()
  );

SELECT pg_notify('pgrst', 'reload schema');
