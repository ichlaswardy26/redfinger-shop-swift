-- Allow staff to view stock logs they create for proper inventory tracking
CREATE POLICY "Staff can view stock logs"
ON public.stock_logs
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));