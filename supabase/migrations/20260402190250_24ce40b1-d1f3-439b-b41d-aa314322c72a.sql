
CREATE TABLE public.cash_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  note TEXT,
  upgraded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cash payments"
ON public.cash_payments
FOR ALL
USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can insert cash payments"
ON public.cash_payments
FOR INSERT
WITH CHECK (public.is_admin_or_pt(auth.uid()));
