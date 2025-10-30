-- Add is_active column to profiles table for user account management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

COMMENT ON COLUMN public.profiles.is_active IS 'Indicates if the user account is active and can access the system';