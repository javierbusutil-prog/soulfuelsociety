
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'community',
  title text NOT NULL,
  body text,
  reference_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications (via trigger with SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify group members on new post
CREATE OR REPLACE FUNCTION public.notify_on_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _author_name text;
BEGIN
  SELECT full_name INTO _author_name FROM public.profiles WHERE id = NEW.user_id;

  FOR _member IN
    SELECT user_id FROM public.group_memberships
    WHERE group_id = NEW.group_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, reference_id)
    VALUES (
      _member.user_id,
      'new_post',
      COALESCE(_author_name, 'Someone') || ' posted in the community',
      LEFT(NEW.content, 100),
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_post();

-- Trigger function: notify post author on new comment
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _post_author_id uuid;
  _commenter_name text;
BEGIN
  SELECT user_id INTO _post_author_id FROM public.posts WHERE id = NEW.post_id;

  -- Don't notify if commenting on own post
  IF _post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO _commenter_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, reference_id)
  VALUES (
    _post_author_id,
    'new_comment',
    COALESCE(_commenter_name, 'Someone') || ' commented on your post',
    LEFT(NEW.content, 100),
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_comment();
