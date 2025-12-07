-- Drop the security definer view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_product_ratings;

-- Create view with SECURITY INVOKER (default behavior, but explicit)
CREATE VIEW public.public_product_ratings 
WITH (security_invoker = true) AS
SELECT 
  pr.id,
  pr.product_id,
  pr.rating,
  pr.review,
  pr.created_at,
  p.name as product_name,
  COALESCE(prof.full_name, 'Anonymous') as reviewer_name
FROM public.product_ratings pr
LEFT JOIN public.products p ON p.id = pr.product_id
LEFT JOIN public.profiles prof ON prof.id = pr.user_id
WHERE pr.is_visible = true;