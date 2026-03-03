-- GreenDuty Marketplace: Dispute Resolution Center (ticketing + evidence)
-- Safe to run multiple times.

-- 1) Dispute status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'dispute_status'
  ) THEN
    CREATE TYPE public.dispute_status AS ENUM ('pending', 'reviewing', 'resolved', 'closed');
  END IF;
END
$$;

-- 2) Admin helper (role-based + allowlist email fallback)
CREATE OR REPLACE FUNCTION public.is_dispute_center_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    coalesce(public.is_marketplace_admin(), false)
    OR lower(
      coalesce(
        (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()),
        ''
      )
    ) = ANY (ARRAY['osgamer804@gmail.com']);
$$;

REVOKE ALL ON FUNCTION public.is_dispute_center_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_dispute_center_admin() TO authenticated, service_role;

-- 3) Disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  product_id uuid NOT NULL,
  reason text NOT NULL,
  description text NOT NULL,
  status public.dispute_status NOT NULL DEFAULT 'pending',
  evidence_url text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT disputes_buyer_id_fkey
    FOREIGN KEY (buyer_id) REFERENCES public.marketplace_profiles(id) ON DELETE CASCADE,
  CONSTRAINT disputes_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.marketplace_profiles(id) ON DELETE CASCADE,
  CONSTRAINT disputes_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS disputes_buyer_idx
  ON public.disputes (buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS disputes_seller_idx
  ON public.disputes (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS disputes_status_idx
  ON public.disputes (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS disputes_open_duplicate_guard_idx
  ON public.disputes (buyer_id, product_id)
  WHERE status IN ('pending', 'reviewing');

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_dispute_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_set_updated_at ON public.disputes;
CREATE TRIGGER trg_disputes_set_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.set_dispute_updated_at();

-- 4) RLS policies
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Disputes: buyers read own" ON public.disputes;
CREATE POLICY "Disputes: buyers read own"
  ON public.disputes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Disputes: buyers insert own" ON public.disputes;
CREATE POLICY "Disputes: buyers insert own"
  ON public.disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND auth.uid() <> seller_id
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Disputes: admins read all" ON public.disputes;
CREATE POLICY "Disputes: admins read all"
  ON public.disputes
  FOR SELECT
  TO authenticated
  USING (public.is_dispute_center_admin());

DROP POLICY IF EXISTS "Disputes: admins update all" ON public.disputes;
CREATE POLICY "Disputes: admins update all"
  ON public.disputes
  FOR UPDATE
  TO authenticated
  USING (public.is_dispute_center_admin())
  WITH CHECK (public.is_dispute_center_admin());

-- 5) Secure evidence bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  false,
  7340032,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Buyers: upload/read/update/delete only own folder (first segment = auth.uid)
DROP POLICY IF EXISTS "Dispute evidence: buyer read own" ON storage.objects;
CREATE POLICY "Dispute evidence: buyer read own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Dispute evidence: buyer upload own" ON storage.objects;
CREATE POLICY "Dispute evidence: buyer upload own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Dispute evidence: buyer update own" ON storage.objects;
CREATE POLICY "Dispute evidence: buyer update own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Dispute evidence: buyer delete own" ON storage.objects;
CREATE POLICY "Dispute evidence: buyer delete own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins: read all evidence objects
DROP POLICY IF EXISTS "Dispute evidence: admins read all" ON storage.objects;
CREATE POLICY "Dispute evidence: admins read all"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND public.is_dispute_center_admin()
  );

SELECT pg_notify('pgrst', 'reload schema');
