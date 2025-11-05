-- Add INSERT policy for profiles table as safety net
-- This provides fallback if trigger fails and allows manual admin recovery
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);