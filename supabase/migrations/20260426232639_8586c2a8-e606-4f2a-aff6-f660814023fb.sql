-- Add sessions_remaining to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sessions_remaining integer;

-- Create manual_payments table
CREATE TABLE IF NOT EXISTS public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'Zelle',
  description text NOT NULL,
  notes text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_user_id ON public.manual_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_payment_date ON public.manual_payments(payment_date DESC);

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

-- Only admins (admin or pt_admin role) can manage / view manual payments.
CREATE POLICY "Admins can view manual payments"
  ON public.manual_payments FOR SELECT
  TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can insert manual payments"
  ON public.manual_payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_pt(auth.uid()) AND auth.uid() = recorded_by);

CREATE POLICY "Admins can update manual payments"
  ON public.manual_payments FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can delete manual payments"
  ON public.manual_payments FOR DELETE
  TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));