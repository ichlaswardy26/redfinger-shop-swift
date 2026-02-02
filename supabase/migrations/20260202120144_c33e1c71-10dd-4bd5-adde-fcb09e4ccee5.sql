-- Fix Security Issue #1: product_ratings exposes user_id publicly
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view visible ratings" ON public.product_ratings;

-- Fix Security Issue #2: Make payment-proofs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';