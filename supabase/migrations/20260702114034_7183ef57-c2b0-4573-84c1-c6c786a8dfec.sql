
CREATE OR REPLACE FUNCTION public.admin_set_membership(
  p_member_id uuid,
  p_target_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_stripe_sub text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(v_caller, 'admin') AND NOT public.has_role(v_caller, 'pt_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_target_role NOT IN ('paid', 'free') THEN
    RAISE EXCEPTION 'admin_set_membership only supports paid or free (got %)', p_target_role;
  END IF;

  -- Hard block: refuse to touch members with an active Stripe subscription.
  -- Stripe drives their status; manual override would cause drift.
  SELECT stripe_subscription_id INTO v_stripe_sub
  FROM public.profiles WHERE id = p_member_id;

  IF v_stripe_sub IS NOT NULL AND length(v_stripe_sub) > 0 THEN
    RAISE EXCEPTION 'This member has an active Stripe subscription. Manage their membership through Stripe (cancel or refund) instead of setting it manually here.';
  END IF;

  IF p_target_role = 'paid' THEN
    UPDATE public.profiles
    SET subscription_status = 'active',
        membership_expires_at = COALESCE(membership_expires_at, now() + interval '30 days'),
        selected_plan = COALESCE(selected_plan, 'online')
    WHERE id = p_member_id;

    DELETE FROM public.user_roles WHERE user_id = p_member_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (p_member_id, 'paid');
  ELSE
    UPDATE public.profiles
    SET subscription_status = 'inactive',
        membership_expires_at = NULL
    WHERE id = p_member_id;

    DELETE FROM public.user_roles WHERE user_id = p_member_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (p_member_id, 'free');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_membership(uuid, app_role) TO authenticated;
