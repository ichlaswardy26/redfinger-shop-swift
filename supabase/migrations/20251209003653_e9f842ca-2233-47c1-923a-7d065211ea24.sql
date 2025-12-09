-- Fix security issues: Add policies to deny anonymous access to sensitive tables

-- Deny anonymous access to profiles table
CREATE POLICY "deny_anon_access_profiles" 
ON public.profiles 
FOR SELECT 
TO anon 
USING (false);

-- Deny anonymous access to orders table  
CREATE POLICY "deny_anon_access_orders"
ON public.orders
FOR SELECT
TO anon
USING (false);

-- Deny anonymous access to user_roles table
CREATE POLICY "deny_anon_access_user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);