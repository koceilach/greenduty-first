-- Education reel reports + moderation RPC

BEGIN;

CREATE TABLE IF NOT EXISTS public.edu_reel_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.edu_reels(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  action_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.edu_reel_reports
  ADD COLUMN IF NOT EXISTS reel_author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS action_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS edu_reel_reports_reel_reporter_uniq
  ON public.edu_reel_reports (reel_id, reporter_id);

CREATE INDEX IF NOT EXISTS edu_reel_reports_status_created_idx
  ON public.edu_reel_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS edu_reel_reports_author_created_idx
  ON public.edu_reel_reports (reel_author_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_edu_reel_report_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reel_author_id IS NULL THEN
    SELECT r.author_id INTO NEW.reel_author_id
    FROM public.edu_reels r
    WHERE r.id = NEW.reel_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_edu_reel_report_sync_author ON public.edu_reel_reports;
CREATE TRIGGER trg_edu_reel_report_sync_author
BEFORE INSERT OR UPDATE OF reel_id
ON public.edu_reel_reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_edu_reel_report_author();

UPDATE public.edu_reel_reports rr
SET reel_author_id = r.author_id
FROM public.edu_reels r
WHERE rr.reel_id = r.id
  AND rr.reel_author_id IS NULL;

ALTER TABLE public.edu_reel_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edu_reel_reports: insert own" ON public.edu_reel_reports;
CREATE POLICY "edu_reel_reports: insert own"
  ON public.edu_reel_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "edu_reel_reports: read own" ON public.edu_reel_reports;
CREATE POLICY "edu_reel_reports: read own"
  ON public.edu_reel_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "edu_reel_reports: moderators read all" ON public.edu_reel_reports;
CREATE POLICY "edu_reel_reports: moderators read all"
  ON public.edu_reel_reports
  FOR SELECT
  TO authenticated
  USING (public.is_platform_moderator(auth.uid()));

DROP POLICY IF EXISTS "edu_reel_reports: moderators update non-admin targets" ON public.edu_reel_reports;
CREATE POLICY "edu_reel_reports: moderators update non-admin targets"
  ON public.edu_reel_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(reel_author_id)
  )
  WITH CHECK (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(reel_author_id)
  );

DROP POLICY IF EXISTS "edu_reel_reports: moderators delete non-admin targets" ON public.edu_reel_reports;
CREATE POLICY "edu_reel_reports: moderators delete non-admin targets"
  ON public.edu_reel_reports
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(reel_author_id)
  );

CREATE OR REPLACE FUNCTION public.mod_update_edu_reel_report(
  p_report_id uuid,
  p_status text,
  p_admin_notes text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_report public.edu_reel_reports%rowtype;
  v_next_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  SELECT * INTO v_report
  FROM public.edu_reel_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Education reel report not found';
  END IF;

  IF public.is_admin_target(v_report.reel_author_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  v_next_status := CASE lower(trim(coalesce(p_status, '')))
    WHEN 'open' THEN 'open'
    WHEN 'reviewed' THEN 'reviewed'
    WHEN 'dismissed' THEN 'dismissed'
    WHEN 'action_taken' THEN 'action_taken'
    ELSE NULL
  END;

  IF v_next_status IS NULL THEN
    RAISE EXCEPTION 'Invalid education reel report status';
  END IF;

  UPDATE public.edu_reel_reports
  SET
    status = v_next_status,
    reviewed_by = v_actor,
    reviewed_at = now(),
    action_note = coalesce(nullif(trim(coalesce(p_admin_notes, '')), ''), action_note)
  WHERE id = p_report_id;

  RETURN jsonb_build_object('ok', true, 'report_id', p_report_id, 'status', v_next_status);
END;
$$;

REVOKE ALL ON FUNCTION public.mod_update_edu_reel_report(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.mod_update_edu_reel_report(uuid, text, text) TO authenticated, service_role;

SELECT pg_notify('pgrst', 'reload schema');

COMMIT;
