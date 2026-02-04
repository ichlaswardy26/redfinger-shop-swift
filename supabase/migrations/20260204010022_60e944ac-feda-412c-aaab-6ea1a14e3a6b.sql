-- Create bucket for category images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('category-images', 'category-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

-- RLS Policy: Anyone can view
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

-- RLS Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images' AND auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can manage category images
CREATE POLICY "Authenticated users can manage category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images' AND auth.role() = 'authenticated');

-- Add image_url column for custom category images
ALTER TABLE product_categories 
ADD COLUMN image_url TEXT;

-- Add comment
COMMENT ON COLUMN product_categories.image_url IS 'URL to custom category image (external URL or storage path)';