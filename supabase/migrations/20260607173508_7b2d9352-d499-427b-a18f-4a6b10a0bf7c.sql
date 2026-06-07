GRANT UPDATE ON public.contact_submissions TO authenticated;
CREATE POLICY "Admins can update contact submissions"
ON public.contact_submissions
FOR UPDATE
TO authenticated
USING (is_admin_or_pt(auth.uid()))
WITH CHECK (is_admin_or_pt(auth.uid()));