-- Create vouchers table
CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'products', 'categories')),
  product_ids UUID[],
  category_ids UUID[],
  stackable BOOLEAN NOT NULL DEFAULT false,
  first_order_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voucher_usage table for tracking
CREATE TABLE public.voucher_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  discount_applied NUMERIC NOT NULL,
  original_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add voucher-related columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN voucher_id UUID REFERENCES public.vouchers(id),
  ADD COLUMN voucher_code TEXT,
  ADD COLUMN discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN original_amount NUMERIC,
  ADD COLUMN final_amount NUMERIC;

-- Create index for faster voucher lookups
CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_vouchers_active ON public.vouchers(is_active, valid_until);
CREATE INDEX idx_voucher_usage_user ON public.voucher_usage(user_id, voucher_id);
CREATE INDEX idx_voucher_usage_order ON public.voucher_usage(order_id);

-- Enable RLS on vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vouchers
CREATE POLICY "Anyone can view active vouchers"
ON public.vouchers FOR SELECT
USING (is_active = true AND valid_until >= now() AND valid_from <= now());

CREATE POLICY "Admins can manage vouchers"
ON public.vouchers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for voucher_usage
CREATE POLICY "Users can view own voucher usage"
ON public.voucher_usage FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all voucher usage"
ON public.voucher_usage FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage voucher usage"
ON public.voucher_usage FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at on vouchers
CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();