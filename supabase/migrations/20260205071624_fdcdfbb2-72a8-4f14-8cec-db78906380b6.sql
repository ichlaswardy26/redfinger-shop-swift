-- Add campaign tracking columns to vouchers table
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS campaign_id text;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS batch_id uuid;

-- Create index for campaign filtering
CREATE INDEX IF NOT EXISTS idx_vouchers_campaign_id ON public.vouchers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_batch_id ON public.vouchers(batch_id);