-- Configure storage bucket security constraints
-- Set 5MB file size limit to prevent storage abuse
UPDATE storage.buckets 
SET file_size_limit = 5242880
WHERE id = 'payment-proofs';

-- Restrict to image types only (JPG, PNG)
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png']
WHERE id = 'payment-proofs';

-- Add RLS policies for storage objects
-- Users can only upload to their own folder (user_id-based path)
CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can only view their own files
CREATE POLICY "Users view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Staff can view all payment proofs for verification
CREATE POLICY "Staff view all payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

-- Staff and admins can update payment proof metadata
CREATE POLICY "Staff update payment proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-proofs' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);

-- Users can delete their own payment proofs (if needed to reupload)
CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);