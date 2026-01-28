-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('free', 'paid', 'admin', 'pt_admin');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('inactive', 'active', 'cancelled', 'past_due');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  subscription_status public.subscription_status DEFAULT 'inactive',
  stripe_customer_id TEXT,
  assigned_coach_id UUID REFERENCES public.profiles(id),
  assigned_pt_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles as required)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create group_memberships table
CREATE TABLE public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create reactions table
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id)
);

-- Create event_type enum
CREATE TYPE public.event_type AS ENUM ('fast', 'workout', 'live_session', 'challenge', 'other');

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type public.event_type DEFAULT 'other',
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  recurrence_rule TEXT,
  checkoff_enabled BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create event_completions table
CREATE TABLE public.event_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Create workout_level and workout_type enums
CREATE TYPE public.workout_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.workout_type AS ENUM ('strength', 'cardio', 'mobility', 'recovery', 'hiit');

-- Create workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level public.workout_level DEFAULT 'beginner',
  workout_type public.workout_type DEFAULT 'strength',
  duration_minutes INT DEFAULT 30,
  equipment TEXT[],
  description TEXT,
  coaching_notes TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create workout_completions table
CREATE TABLE public.workout_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, workout_id)
);

-- Create threads table for 1:1 messaging
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  tag TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create plan_item_type enum
CREATE TYPE public.plan_item_type AS ENUM ('workout', 'nutrition');

-- Create plan_items table
CREATE TABLE public.plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  item_type public.plan_item_type NOT NULL,
  workout_id UUID REFERENCES public.workouts(id),
  title TEXT NOT NULL,
  notes TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create plan_completions table
CREATE TABLE public.plan_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_item_id UUID REFERENCES public.plan_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(plan_item_id, user_id)
);

-- Create pt_intakes table
CREATE TABLE public.pt_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  main_goal TEXT,
  injury_history TEXT,
  pain_area TEXT,
  pain_scale INT CHECK (pain_scale BETWEEN 0 AND 10),
  equipment_available TEXT[],
  contraindications TEXT,
  consent_given BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create pt_consult_type enum
CREATE TYPE public.pt_consult_type AS ENUM ('injury_screen', 'program_modification', 'mobility_assessment', 'other');
CREATE TYPE public.pt_consult_status AS ENUM ('pending', 'approved', 'scheduled', 'completed', 'declined');

-- Create pt_consult_requests table
CREATE TABLE public.pt_consult_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consult_type public.pt_consult_type DEFAULT 'other',
  preferred_times JSONB,
  notes TEXT,
  status public.pt_consult_status DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  assigned_pt_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create pt_consult_notes table
CREATE TABLE public.pt_consult_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consult_request_id UUID REFERENCES public.pt_consult_requests(id) ON DELETE CASCADE NOT NULL,
  summary TEXT,
  recommendations TEXT,
  modifications TEXT,
  red_flags TEXT,
  follow_up_plan TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create product_type enum
CREATE TYPE public.product_type AS ENUM ('digital', 'physical');

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  images JSONB,
  category TEXT,
  product_type public.product_type DEFAULT 'digital',
  inventory_count INT,
  delivery_asset_url TEXT,
  active BOOLEAN DEFAULT true,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'fulfilled', 'cancelled');

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_id TEXT,
  total DECIMAL(10,2) NOT NULL,
  status public.order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INT DEFAULT 1,
  price DECIMAL(10,2) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_consult_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_consult_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user is admin or pt_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_pt(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'pt_admin')
  )
$$;

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND subscription_status = 'active'
  )
$$;

-- Create function to check if user is paid member
CREATE OR REPLACE FUNCTION public.is_paid_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('paid', 'admin', 'pt_admin')
  ) AND public.has_active_subscription(_user_id)
$$;

-- PROFILES POLICIES
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- USER_ROLES POLICIES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- GROUPS POLICIES
CREATE POLICY "Anyone can view groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Admins can manage groups" ON public.groups FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- GROUP_MEMBERSHIPS POLICIES
CREATE POLICY "Users can view memberships" ON public.group_memberships FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_memberships FOR DELETE USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));

-- POSTS POLICIES
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Users can delete own posts or admins" ON public.posts FOR DELETE USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));

-- COMMENTS POLICIES
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments or admins" ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));

-- REACTIONS POLICIES
CREATE POLICY "Anyone can view reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- EVENTS POLICIES
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- EVENT_COMPLETIONS POLICIES
CREATE POLICY "Users can view own completions" ON public.event_completions FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Users can mark events complete" ON public.event_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own completions" ON public.event_completions FOR DELETE USING (auth.uid() = user_id);

-- WORKOUTS POLICIES
CREATE POLICY "Anyone can view workouts" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Admins can manage workouts" ON public.workouts FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- WORKOUT_COMPLETIONS POLICIES
CREATE POLICY "Users can view own completions" ON public.workout_completions FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Users can log completions" ON public.workout_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FAVORITES POLICIES
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- THREADS POLICIES (Paid only)
CREATE POLICY "Users can view own threads" ON public.threads FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = admin_id OR public.is_admin_or_pt(auth.uid())
);
CREATE POLICY "Paid users can create threads" ON public.threads FOR INSERT WITH CHECK (
  auth.uid() = user_id AND public.is_paid_member(auth.uid())
);

-- MESSAGES POLICIES (Paid only)
CREATE POLICY "Thread participants can view messages" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.threads t 
    WHERE t.id = thread_id AND (t.user_id = auth.uid() OR t.admin_id = auth.uid() OR public.is_admin_or_pt(auth.uid()))
  )
);
CREATE POLICY "Thread participants can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    public.is_paid_member(auth.uid()) OR public.is_admin_or_pt(auth.uid())
  )
);

-- PLANS POLICIES (Paid only)
CREATE POLICY "Users can view own plans" ON public.plans FOR SELECT USING (
  auth.uid() = user_id OR public.is_admin_or_pt(auth.uid())
);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- PLAN_ITEMS POLICIES
CREATE POLICY "Users can view plan items" ON public.plan_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND (p.user_id = auth.uid() OR public.is_admin_or_pt(auth.uid())))
);
CREATE POLICY "Admins can manage plan items" ON public.plan_items FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- PLAN_COMPLETIONS POLICIES
CREATE POLICY "Users can view own completions" ON public.plan_completions FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Users can mark complete" ON public.plan_completions FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_paid_member(auth.uid()));

-- PT_INTAKES POLICIES (Paid only)
CREATE POLICY "Users can view own intake" ON public.pt_intakes FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Paid users can create intake" ON public.pt_intakes FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_paid_member(auth.uid()));
CREATE POLICY "Users can update own intake" ON public.pt_intakes FOR UPDATE USING (auth.uid() = user_id);

-- PT_CONSULT_REQUESTS POLICIES
CREATE POLICY "Users can view own requests" ON public.pt_consult_requests FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Paid users can create requests" ON public.pt_consult_requests FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_paid_member(auth.uid()));
CREATE POLICY "Admins can update requests" ON public.pt_consult_requests FOR UPDATE USING (public.is_admin_or_pt(auth.uid()));

-- PT_CONSULT_NOTES POLICIES
CREATE POLICY "Users can view notes for own consults" ON public.pt_consult_notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pt_consult_requests r WHERE r.id = consult_request_id AND (r.user_id = auth.uid() OR public.is_admin_or_pt(auth.uid())))
);
CREATE POLICY "PT admins can manage notes" ON public.pt_consult_notes FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- PRODUCTS POLICIES
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (active = true OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.is_admin_or_pt(auth.uid()));

-- ORDERS POLICIES
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (public.is_admin_or_pt(auth.uid()));

-- ORDER_ITEMS POLICIES
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin_or_pt(auth.uid())))
);
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;