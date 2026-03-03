-- Extend global moderation dashboard actions:
-- - delete education post/reel
-- - timed education bans (1..7 days)
-- - delete marketplace product

BEGIN;

CREATE OR REPLACE FUNCTION public.mod_delete_education_post(
  p_post_id uuid,
  p_reason text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_post public.edu_posts%rowtype;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  SELECT * INTO v_post
  FROM public.edu_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Education post not found';
  END IF;

  IF public.is_admin_target(v_post.user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  UPDATE public.edu_posts
  SET status = 'archived'
  WHERE id = p_post_id
    AND status <> 'archived';

  RETURN jsonb_build_object(
    'ok', true,
    'post_id', p_post_id,
    'action', 'archived',
    'reason', nullif(trim(coalesce(p_reason, '')), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_delete_education_reel(
  p_reel_id uuid,
  p_reason text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_reel public.edu_reels%rowtype;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  SELECT * INTO v_reel
  FROM public.edu_reels
  WHERE id = p_reel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Education reel not found';
  END IF;

  IF public.is_admin_target(v_reel.author_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  DELETE FROM public.edu_reels
  WHERE id = p_reel_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reel_id', p_reel_id,
    'action', 'deleted',
    'reason', nullif(trim(coalesce(p_reason, '')), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_ban_education_user(
  p_target_user_id uuid,
  p_days integer,
  p_reason text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_ends_at timestamptz;
  v_sanction_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 7 THEN
    RAISE EXCEPTION 'Ban duration must be between 1 and 7 days';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF public.is_admin_target(p_target_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  UPDATE public.edu_user_sanctions
  SET
    active = false,
    lifted_at = now(),
    lifted_by = v_actor
  WHERE user_id = p_target_user_id
    AND active = true
    AND sanction_type IN ('mute_education', 'suspend_education', 'ban_education');

  v_ends_at := now() + make_interval(days => p_days);

  INSERT INTO public.edu_user_sanctions (
    user_id,
    sanction_type,
    reason,
    active,
    starts_at,
    ends_at,
    created_by
  )
  VALUES (
    p_target_user_id,
    'suspend_education',
    coalesce(v_reason, 'Temporary education suspension by moderation'),
    true,
    now(),
    v_ends_at,
    v_actor
  )
  RETURNING id INTO v_sanction_id;

  RETURN jsonb_build_object(
    'ok', true,
    'target_user_id', p_target_user_id,
    'sanction_id', v_sanction_id,
    'days', p_days,
    'ends_at', v_ends_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mod_delete_marketplace_product(
  p_product_id uuid,
  p_reason text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_item public.marketplace_items%rowtype;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_moderator(v_actor) THEN
    RAISE EXCEPTION 'Moderator or admin access required';
  END IF;

  SELECT * INTO v_item
  FROM public.marketplace_items
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Marketplace product not found';
  END IF;

  IF public.is_admin_target(v_item.seller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot take action against an Admin';
  END IF;

  DELETE FROM public.marketplace_items
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'ok', true,
    'product_id', p_product_id,
    'action', 'deleted',
    'reason', nullif(trim(coalesce(p_reason, '')), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mod_delete_education_post(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.mod_delete_education_reel(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.mod_ban_education_user(uuid, integer, text) FROM public;
REVOKE ALL ON FUNCTION public.mod_delete_marketplace_product(uuid, text) FROM public;

GRANT EXECUTE ON FUNCTION public.mod_delete_education_post(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mod_delete_education_reel(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mod_ban_education_user(uuid, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mod_delete_marketplace_product(uuid, text) TO authenticated, service_role;

SELECT pg_notify('pgrst', 'reload schema');

COMMIT;
