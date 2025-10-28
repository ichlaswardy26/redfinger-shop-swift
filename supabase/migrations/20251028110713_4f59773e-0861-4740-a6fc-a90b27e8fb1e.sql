-- Allow users to insert their own orders
CREATE POLICY "Users can create own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);