
-- Table: community_notification_log
CREATE TABLE public.community_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now(),
  channels text[] NOT NULL DEFAULT '{}',
  delivered boolean NOT NULL DEFAULT false
);

ALTER TABLE public.community_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification logs"
  ON public.community_notification_log FOR SELECT
  TO authenticated
  USING (is_admin_or_pt(auth.uid()));

CREATE POLICY "System can insert notification logs"
  ON public.community_notification_log FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_pt(auth.uid()));

-- Table: coach_push_tokens
CREATE TABLE public.coach_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  push_token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, push_token)
);

ALTER TABLE public.coach_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own push tokens"
  ON public.coach_push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Table: coach_notification_preferences
CREATE TABLE public.coach_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  inapp_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.coach_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own preferences"
  ON public.coach_notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Updated trigger function: notify coaches on new community posts
-- This replaces/extends the existing notify_on_new_post to also notify coaches
CREATE OR REPLACE FUNCTION public.notify_coaches_on_community_post()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _coach RECORD;
  _author_name text;
  _is_author_coach boolean;
  _inapp_enabled boolean;
  _channels text[];
BEGIN
  -- Check if the author is a coach — if so, skip all notifications
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role IN ('admin', 'pt_admin')
  ) INTO _is_author_coach;

  IF _is_author_coach THEN
    RETURN NEW;
  END IF;

  -- Get author name
  SELECT full_name INTO _author_name FROM public.profiles WHERE id = NEW.user_id;

  -- Loop through all coaches
  FOR _coach IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'pt_admin')
  LOOP
    -- Check preferences
    SELECT COALESCE(cnp.inapp_enabled, true)
    INTO _inapp_enabled
    FROM public.coach_notification_preferences cnp
    WHERE cnp.coach_id = _coach.user_id;

    -- Default to true if no preferences row exists
    IF NOT FOUND THEN
      _inapp_enabled := true;
    END IF;

    _channels := '{}';

    -- In-app notification
    IF _inapp_enabled THEN
      INSERT INTO public.notifications (user_id, type, title, body, reference_id)
      VALUES (
        _coach.user_id,
        'community_post',
        'New community post',
        COALESCE(_author_name, 'Someone') || ' just posted in the community: ''' || LEFT(NEW.content, 80) || CASE WHEN LENGTH(NEW.content) > 80 THEN '...' ELSE '' END || '''',
        NEW.id
      );
      _channels := array_append(_channels, 'inapp');
    END IF;

    -- Log the notification
    INSERT INTO public.community_notification_log (post_id, coach_id, channels, delivered)
    VALUES (NEW.id, _coach.user_id, _channels, true);
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger on posts table
CREATE TRIGGER notify_coaches_on_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_coaches_on_community_post();
