-- Make payment-proofs bucket public so images can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'payment-proofs';

-- Add RLS policies for public read access to payment proofs
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

-- Add reason column to stock_logs
ALTER TABLE stock_logs ADD COLUMN reason TEXT;

-- Make reason required for future entries (but allow NULL for existing)
ALTER TABLE stock_logs ADD CONSTRAINT reason_not_empty CHECK (reason IS NULL OR length(trim(reason)) > 0);