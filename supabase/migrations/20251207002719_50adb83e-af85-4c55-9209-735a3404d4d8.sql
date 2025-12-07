-- Add RLS policy for users to view their own ratings (even when hidden)
CREATE POLICY "Users can view own ratings" 
ON public.product_ratings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create view for public product ratings that doesn't expose sensitive user_id, order_id
CREATE OR REPLACE VIEW public.public_product_ratings AS
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