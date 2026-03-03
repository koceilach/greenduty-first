-- Ensure BOTH moderators and admins can read education reports in moderation views.

BEGIN;

ALTER TABLE IF EXISTS public.edu_post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.edu_reel_reports ENABLE ROW LEVEL SECURITY;

-- Post reports: explicit read policy for moderators + admins
DROP POLICY IF EXISTS "edu_post_reports: moderators read all" ON public.edu_post_reports;
DROP POLICY IF EXISTS "edu_post_reports: moderators and admins read all" ON public.edu_post_reports;
CREATE POLICY "edu_post_reports: moderators and admins read all"
  ON public.edu_post_reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- Reel reports: explicit read policy for moderators + admins
DROP POLICY IF EXISTS "edu_reel_reports: moderators read all" ON public.edu_reel_reports;
DROP POLICY IF EXISTS "edu_reel_reports: moderators and admins read all" ON public.edu_reel_reports;
CREATE POLICY "edu_reel_reports: moderators and admins read all"
  ON public.edu_reel_reports
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

SELECT pg_notify('pgrst', 'reload schema');

COMMIT;
