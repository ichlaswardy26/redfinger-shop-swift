-- Add payment gateway columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'manual';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_trx_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS qr_link text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_expired_at timestamptz;

-- Add payment_gateway configuration to business_rules
INSERT INTO public.business_rules (key, value, description) 
VALUES (
  'payment_gateway', 
  '{"enabled": false, "provider": "tokopay", "merchant_id": "", "qris_enabled": true, "auto_delivery": true}'::jsonb, 
  'Payment gateway configuration for automatic payments'
)
ON CONFLICT (key) DO NOTHING;