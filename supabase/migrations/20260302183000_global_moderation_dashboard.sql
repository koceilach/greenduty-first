-- Global Moderation Dashboard foundation
-- Roles hierarchy: user < moderator < admin
-- Moderators/admins can manage queues, but NO actions against admin targets.

-- 1) Global role enum + profiles role normalization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'global_user_role'
  ) THEN
    CREATE TYPE public.global_user_role AS ENUM ('user', 'moderator', 'admin');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  username text,
  avatar_url text,
  role public.global_user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Drop policies that directly depend on public.profiles.role before type conversion.
DO $$
BEGIN
  IF to_regclass('public.message_edit_history') IS NOT NULL THEN
    EXECUTE 'drop policy if exists "Read message edit history as participant" on public.message_edit_history';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    BEGIN
      EXECUTE 'alter table public.profiles drop constraint if exists profiles_role_check';
      EXECUTE 'alter table public.profiles alter column role drop default';
      EXECUTE '
        alter table public.profiles
        alter column role type public.global_user_role
        using (
          case
            when lower(coalesce(role::text, '''')) = ''admin'' then ''admin''::public.global_user_role
            when lower(coalesce(role::text, '''')) = ''moderator'' then ''moderator''::public.global_user_role
            else ''user''::public.global_user_role
          end
        )';
      EXECUTE 'alter table public.profiles alter column role set default ''user''::public.global_user_role';
      EXECUTE 'alter table public.profiles alter column role set not null';
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END;
  ELSE
    ALTER TABLE public.profiles
      ADD COLUMN role public.global_user_role NOT NULL DEFAULT 'user';
  END IF;
END
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_reason text;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_is_banned_idx ON public.profiles (is_banned);

-- 2) Moderation helper functions
CREATE OR REPLACE FUNCTION public.get_platform_role(p_user_id uuid DEFAULT auth.uid())
RETURNS public.global_user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT p.role FROM public.profiles p WHERE p.id = coalesce(p_user_id, auth.uid())),
    'user'::public.global_user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_moderator(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_platform_role(coalesce(p_user_id, auth.uid())) IN ('moderator', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_target(p_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.get_platform_role(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_platform_moderator(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_admin_target(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_platform_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_moderator(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_target(uuid) TO authenticated, service_role;

-- Re-create policy dropped before role-type conversion, now using role helper function.
DO $$
BEGIN
  IF to_regclass('public.message_edit_history') IS NOT NULL THEN
    EXECUTE '
      create policy "Read message edit history as participant"
        on public.message_edit_history
        for select
        to authenticated
        using (
          exists (
            select 1
            from public.messages m
            join public.conversation_participants cp
              on cp.conversation_id = m.conversation_id
            where m.id = message_edit_history.message_id
              and cp.user_id = auth.uid()
          )
          or public.get_platform_role(auth.uid()) = ''admin''::public.global_user_role
        )';
  END IF;
END
$$;

-- 3) Seller Requests queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'seller_request_status'
  ) THEN
    CREATE TYPE public.seller_request_status AS ENUM ('pending', 'approved', 'denied');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.seller_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_store_name text,
  requested_bio text,
  status public.seller_request_status NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  source_application_id uuid UNIQUE
);

CREATE INDEX IF NOT EXISTS seller_requests_status_created_idx
  ON public.seller_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_requests_user_idx
  ON public.seller_requests (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS seller_requests_one_pending_per_user_idx
  ON public.seller_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE public.seller_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_requests: user insert own" ON public.seller_requests;
CREATE POLICY "seller_requests: user insert own"
  ON public.seller_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND NOT public.is_admin_target(user_id)
  );

DROP POLICY IF EXISTS "seller_requests: user read own" ON public.seller_requests;
CREATE POLICY "seller_requests: user read own"
  ON public.seller_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seller_requests: moderators read all" ON public.seller_requests;
CREATE POLICY "seller_requests: moderators read all"
  ON public.seller_requests
  FOR SELECT
  TO authenticated
  USING (public.is_platform_moderator(auth.uid()));

DROP POLICY IF EXISTS "seller_requests: moderators update non-admin targets" ON public.seller_requests;
CREATE POLICY "seller_requests: moderators update non-admin targets"
  ON public.seller_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(user_id)
  )
  WITH CHECK (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(user_id)
  );

DROP POLICY IF EXISTS "seller_requests: moderators delete non-admin targets" ON public.seller_requests;
CREATE POLICY "seller_requests: moderators delete non-admin targets"
  ON public.seller_requests
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(user_id)
  );

-- 4) Market Disputes queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'market_dispute_status'
  ) THEN
    CREATE TYPE public.market_dispute_status AS ENUM ('pending', 'reviewing', 'resolved', 'closed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.market_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dispute_id uuid UNIQUE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.marketplace_items(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text NOT NULL,
  status public.market_dispute_status NOT NULL DEFAULT 'pending',
  evidence_url text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_disputes_status_created_idx
  ON public.market_disputes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS market_disputes_seller_idx
  ON public.market_disputes (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS market_disputes_buyer_idx
  ON public.market_disputes (buyer_id, created_at DESC);

ALTER TABLE public.market_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_disputes: buyers read own" ON public.market_disputes;
CREATE POLICY "market_disputes: buyers read own"
  ON public.market_disputes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "market_disputes: buyers insert own" ON public.market_disputes;
CREATE POLICY "market_disputes: buyers insert own"
  ON public.market_disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND auth.uid() <> seller_id
    AND status = 'pending'
    AND NOT public.is_admin_target(seller_id)
  );

DROP POLICY IF EXISTS "market_disputes: moderators read all" ON public.market_disputes;
CREATE POLICY "market_disputes: moderators read all"
  ON public.market_disputes
  FOR SELECT
  TO authenticated
  USING (public.is_platform_moderator(auth.uid()));

DROP POLICY IF EXISTS "market_disputes: moderators update non-admin targets" ON public.market_disputes;
CREATE POLICY "market_disputes: moderators update non-admin targets"
  ON public.market_disputes
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(seller_id)
    AND NOT public.is_admin_target(buyer_id)
  )
  WITH CHECK (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(seller_id)
    AND NOT public.is_admin_target(buyer_id)
  );

DROP POLICY IF EXISTS "market_disputes: moderators delete non-admin targets" ON public.market_disputes;
CREATE POLICY "market_disputes: moderators delete non-admin targets"
  ON public.market_disputes
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(seller_id)
    AND NOT public.is_admin_target(buyer_id)
  );

-- 5) Ensure EDU reports are moderation-ready
ALTER TABLE IF EXISTS public.edu_post_reports
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS post_author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS edu_post_reports_post_author_idx
  ON public.edu_post_reports (post_author_id, created_at DESC);

UPDATE public.edu_post_reports r
SET post_author_id = p.user_id
FROM public.edu_posts p
WHERE r.post_id = p.id
  AND r.post_author_id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_edu_report_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.post_author_id IS NULL THEN
    SELECT p.user_id INTO NEW.post_author_id
    FROM public.edu_posts p
    WHERE p.id = NEW.post_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_edu_report_sync_author ON public.edu_post_reports;
CREATE TRIGGER trg_edu_report_sync_author
BEFORE INSERT OR UPDATE OF post_id
ON public.edu_post_reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_edu_report_author();

ALTER TABLE public.edu_post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edu_post_reports: insert own" ON public.edu_post_reports;
CREATE POLICY "edu_post_reports: insert own"
  ON public.edu_post_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "edu_post_reports: read own" ON public.edu_post_reports;
CREATE POLICY "edu_post_reports: read own"
  ON public.edu_post_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "edu_post_reports: admin read all" ON public.edu_post_reports;
DROP POLICY IF EXISTS "edu_post_reports: admin update" ON public.edu_post_reports;
DROP POLICY IF EXISTS "edu_post_reports: moderators read all" ON public.edu_post_reports;
DROP POLICY IF EXISTS "edu_post_reports: moderators update non-admin targets" ON public.edu_post_reports;
DROP POLICY IF EXISTS "edu_post_reports: moderators delete non-admin targets" ON public.edu_post_reports;

CREATE POLICY "edu_post_reports: moderators read all"
  ON public.edu_post_reports
  FOR SELECT
  TO authenticated
  USING (public.is_platform_moderator(auth.uid()));

CREATE POLICY "edu_post_reports: moderators update non-admin targets"
  ON public.edu_post_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(post_author_id)
  )
  WITH CHECK (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(post_author_id)
  );

CREATE POLICY "edu_post_reports: moderators delete non-admin targets"
  ON public.edu_post_reports
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_moderator(auth.uid())
    AND NOT public.is_admin_target(post_author_id)
  );

-- 6) Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.moderation_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_requests_updated_at ON public.seller_requests;
CREATE TRIGGER trg_seller_requests_updated_at
BEFORE UPDATE ON public.seller_requests
FOR EACH ROW
EXECUTE FUNCTION public.moderation_set_updated_at();

DROP TRIGGER IF EXISTS trg_market_disputes_updated_at ON public.market_disputes;
CREATE TRIGGER trg_market_disputes_updated_at
BEFORE UPDATE ON public.market_disputes
FOR EACH ROW
EXECUTE FUNCTION public.moderation_set_updated_at();

-- 7) Sync existing Marketplace tables into moderation tables
CREATE OR REPLACE FUNCTION public.sync_seller_applications_to_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.seller_request_status;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_status := CASE lower(coalesce(NEW.status::text, 'pending'))
    WHEN 'approved' THEN 'approved'::public.seller_request_status
    WHEN 'rejected' THEN 'denied'::public.seller_request_status
    ELSE 'pending'::public.seller_request_status
  END;

  INSERT INTO public.seller_requests (
    user_id,
    requested_store_name,
    requested_bio,
    status,
    admin_note,
    created_at,
    updated_at,
    reviewed_by,
    reviewed_at,
    source_application_id
  )
  VALUES (
    NEW.user_id,
    NEW.store_name,
    NEW.bio,
    v_status,
    NEW.rejection_reason,
    coalesce(NEW.created_at, now()),
    now(),
    NEW.reviewed_by,
    NEW.reviewed_at,
    NEW.id
  )
  ON CONFLICT (source_application_id) DO UPDATE
  SET
    requested_store_name = excluded.requested_store_name,
    requested_bio = excluded.requested_bio,
    status = excluded.status,
    admin_note = excluded.admin_note,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.marketplace_seller_applications') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_marketplace_seller_apps_to_moderation
      ON public.marketplace_seller_applications;

    CREATE TRIGGER trg_sync_marketplace_seller_apps_to_moderation
    AFTER INSERT OR UPDATE OF status, store_name, bio, rejection_reason, reviewed_by, reviewed_at
    ON public.marketplace_seller_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_seller_applications_to_moderation();

    INSERT INTO public.seller_requests (
      user_id,
      requested_store_name,
      requested_bio,
      status,
      admin_note,
      created_at,
      updated_at,
      reviewed_by,
      reviewed_at,
      source_application_id
    )
    SELECT
      s.user_id,
      s.store_name,
      s.bio,
      CASE lower(coalesce(s.status, 'pending'))
        WHEN 'approved' THEN 'approved'::public.seller_request_status
        WHEN 'rejected' THEN 'denied'::public.seller_request_status
        ELSE 'pending'::public.seller_request_status
      END,
      s.rejection_reason,
      coalesce(s.created_at, now()),
      now(),
      s.reviewed_by,
      s.reviewed_at,
      s.id
    FROM public.marketplace_seller_applications s
    ON CONFLICT (source_application_id) DO NOTHING;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.sync_disputes_to_market_disputes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.market_dispute_status;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_status := CASE lower(coalesce(NEW.status::text, 'pending'))
    WHEN 'reviewing' THEN 'reviewing'::public.market_dispute_status
    WHEN 'resolved' THEN 'resolved'::public.market_dispute_status
    WHEN 'closed' THEN 'closed'::public.market_dispute_status
    ELSE 'pending'::public.market_dispute_status
  END;

  INSERT INTO public.market_disputes (
    source_dispute_id,
    buyer_id,
    seller_id,
    product_id,
    reason,
    description,
    status,
    evidence_url,
    admin_notes,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.buyer_id,
    NEW.seller_id,
    NEW.product_id,
    NEW.reason,
    NEW.description,
    v_status,
    NEW.evidence_url,
    NEW.admin_notes,
    coalesce(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (source_dispute_id) DO UPDATE
  SET
    buyer_id = excluded.buyer_id,
    seller_id = excluded.seller_id,
    product_id = excluded.product_id,
    reason = excluded.reason,
    description = excluded.description,
    status = excluded.status,
    evidence_url = excluded.evidence_url,
    admin_notes = excluded.admin_notes,
    updated_at = now()
  WHERE
    public.market_disputes.buyer_id IS DISTINCT FROM excluded.buyer_id
    OR public.market_disputes.seller_id IS DISTINCT FROM excluded.seller_id
    OR public.market_disputes.product_id IS DISTINCT FROM excluded.product_id
    OR public.market_disputes.reason IS DISTINCT FROM excluded.reason
    OR public.market_disputes.description IS DISTINCT FROM excluded.description
    OR public.market_disputes.status IS DISTINCT FROM excluded.status
    OR public.market_disputes.evidence_url IS DISTINCT FROM excluded.evidence_url
    OR public.market_disputes.admin_notes IS DISTINCT FROM excluded.admin_notes;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_market_disputes_back_to_disputes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.source_dispute_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.disputes
  SET
    status = NEW.status::text,
    admin_notes = NEW.admin_notes,
    updated_at = now()
  WHERE id = NEW.source_dispute_id
    AND (
      status IS DISTINCT FROM NEW.status::text
      OR admin_notes IS DISTINCT FROM NEW.admin_notes
    );

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.disputes') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_disputes_to_market_disputes
      ON public.disputes;

    CREATE TRIGGER trg_sync_disputes_to_market_disputes
    AFTER INSERT OR UPDATE OF status, reason, description, evidence_url, admin_notes
    ON public.disputes
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_disputes_to_market_disputes();

    INSERT INTO public.market_disputes (
      source_dispute_id,
      buyer_id,
      seller_id,
      product_id,
      reason,
      description,
      status,
      evidence_url,
      admin_notes,
      created_at,
      updated_at
    )
    SELECT
      d.id,
      d.buyer_id,
      d.seller_id,
      d.product_id,
      d.reason,
      d.description,
      CASE lower(coalesce(d.status, 'pending'))
        WHEN 'reviewing' THEN 'reviewing'::public.market_dispute_status
        WHEN 'resolved' THEN 'resolved'::public.market_dispute_status
        WHEN 'closed' THEN 'closed'::public.market_dispute_status
        ELSE 'pending'::public.market_dispute_status
      END,
      d.evidence_url,
      d.admin_notes,
      d.created_at,
      now()
    FROM public.disputes d
    ON CONFLICT (source_dispute_id) DO NOTHING;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_sync_market_disputes_back_to_disputes
  ON public.market_disputes;
CREATE TRIGGER trg_sync_market_disputes_back_to_disputes
AFTER UPDATE OF status, admin_notes
ON public.market_disputes
FOR EACH ROW
EXECUTE FUNCTION public.sync_market_disputes_back_to_disputes();

-- 8) Moderation RPCs (security-definer)
CREATE OR REPLACE FUNCTION public.mod_handle_seller_request(
  p_request_id uuid,
  p_status text,
  p_admin_note text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.seller_requests%rowtype;
  v_next_status public.seller_request_status;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  SELECT * INTO v_request
  FROM public.seller_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller request not found';
  END IF;

  IF public.is_admin_target(v_request.user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  v_next_status := CASE lower(trim(coalesce(p_status, '')))
    WHEN 'approved' THEN 'approved'::public.seller_request_status
    WHEN 'denied' THEN 'denied'::public.seller_request_status
    ELSE NULL
  END;

  IF v_next_status IS NULL THEN
    RAISE EXCEPTION 'Invalid seller request status';
  END IF;

  UPDATE public.seller_requests
  SET
    status = v_next_status,
    admin_note = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), admin_note),
    reviewed_by = v_actor,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  IF v_next_status = 'approved' THEN
    UPDATE public.marketplace_profiles
    SET
      role = case when role = 'admin' then 'admin' else 'seller' end,
      updated_at = now()
    WHERE id = v_request.user_id;
  END IF;

  IF v_request.source_application_id IS NOT NULL
     AND to_regclass('public.marketplace_seller_applications') IS NOT NULL THEN
    UPDATE public.marketplace_seller_applications
    SET
      status = CASE
        WHEN v_next_status = 'approved' THEN 'approved'
        ELSE 'rejected'
      END,
      rejection_reason = CASE
        WHEN v_next_status = 'denied' THEN coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), rejection_reason)
        ELSE rejection_reason
      END,
      reviewed_by = v_actor,
      reviewed_at = now(),
      updated_at = now()
    WHERE id = v_request.source_application_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', p_request_id, 'status', v_next_status::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_take_user_action(
  p_target_user_id uuid,
  p_action text,
  p_reason text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  IF public.is_admin_target(p_target_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  IF v_action = 'ban_user' THEN
    UPDATE public.profiles
    SET
      is_banned = true,
      banned_at = now(),
      banned_reason = coalesce(v_reason, 'Banned by moderation'),
      updated_at = now()
    WHERE id = p_target_user_id;

  ELSIF v_action = 'delete_post' THEN
    UPDATE public.edu_posts
    SET
      status = 'archived'
    WHERE user_id = p_target_user_id
      AND status <> 'archived';

  ELSIF v_action = 'ban_seller' THEN
    UPDATE public.marketplace_profiles
    SET
      role = case when role = 'admin' then 'admin' else 'buyer' end,
      store_name = null,
      updated_at = now()
    WHERE id = p_target_user_id;

  ELSE
    RAISE EXCEPTION 'Unsupported moderation action: %', p_action;
  END IF;

  RETURN jsonb_build_object('ok', true, 'target_user_id', p_target_user_id, 'action', v_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_update_market_dispute(
  p_dispute_id uuid,
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
  v_dispute public.market_disputes%rowtype;
  v_next_status public.market_dispute_status;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  SELECT * INTO v_dispute
  FROM public.market_disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market dispute not found';
  END IF;

  IF public.is_admin_target(v_dispute.seller_id) OR public.is_admin_target(v_dispute.buyer_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  v_next_status := CASE lower(trim(coalesce(p_status, '')))
    WHEN 'pending' THEN 'pending'::public.market_dispute_status
    WHEN 'reviewing' THEN 'reviewing'::public.market_dispute_status
    WHEN 'resolved' THEN 'resolved'::public.market_dispute_status
    WHEN 'closed' THEN 'closed'::public.market_dispute_status
    ELSE NULL
  END;

  IF v_next_status IS NULL THEN
    RAISE EXCEPTION 'Invalid market dispute status';
  END IF;

  UPDATE public.market_disputes
  SET
    status = v_next_status,
    admin_notes = coalesce(nullif(trim(coalesce(p_admin_notes, '')), ''), admin_notes),
    updated_at = now()
  WHERE id = p_dispute_id;

  RETURN jsonb_build_object('ok', true, 'dispute_id', p_dispute_id, 'status', v_next_status::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_update_edu_post_report(
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
  v_report public.edu_post_reports%rowtype;
  v_next_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  SELECT * INTO v_report
  FROM public.edu_post_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Education report not found';
  END IF;

  IF public.is_admin_target(v_report.post_author_id) THEN
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
    RAISE EXCEPTION 'Invalid education report status';
  END IF;

  UPDATE public.edu_post_reports
  SET
    status = v_next_status,
    reviewed_by = v_actor,
    reviewed_at = now(),
    action_note = coalesce(nullif(trim(coalesce(p_admin_notes, '')), ''), action_note)
  WHERE id = p_report_id;

  RETURN jsonb_build_object('ok', true, 'report_id', p_report_id, 'status', v_next_status);
END;
$$;

REVOKE ALL ON FUNCTION public.mod_handle_seller_request(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.mod_take_user_action(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.mod_update_market_dispute(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.mod_update_edu_post_report(uuid, text, text) FROM public;

GRANT EXECUTE ON FUNCTION public.mod_handle_seller_request(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mod_take_user_action(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mod_update_market_dispute(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mod_update_edu_post_report(uuid, text, text) TO authenticated, service_role;

SELECT pg_notify('pgrst', 'reload schema');
