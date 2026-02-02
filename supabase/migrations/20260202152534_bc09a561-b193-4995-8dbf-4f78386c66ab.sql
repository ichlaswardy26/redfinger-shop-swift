-- =============================================
-- Auto-Delivery Code System & Business Rules
-- =============================================

-- 1. Redeem Code Inventory table for pre-uploaded codes
CREATE TABLE IF NOT EXISTS public.redeem_code_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_redeem_code_inventory_product_unused 
  ON public.redeem_code_inventory(product_id) 
  WHERE is_used = false;

CREATE INDEX IF NOT EXISTS idx_redeem_code_inventory_order 
  ON public.redeem_code_inventory(order_id);

-- Add auto_delivery flag to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS auto_delivery BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.redeem_code_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for redeem_code_inventory
CREATE POLICY "Admins can manage code inventory" 
  ON public.redeem_code_inventory
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view code inventory" 
  ON public.redeem_code_inventory
  FOR SELECT 
  USING (has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update code inventory" 
  ON public.redeem_code_inventory
  FOR UPDATE 
  USING (has_role(auth.uid(), 'staff'));

-- 2. Business Rules Settings table
CREATE TABLE IF NOT EXISTS public.business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_rules
CREATE POLICY "Anyone can view business rules" 
  ON public.business_rules
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage business rules" 
  ON public.business_rules
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- Insert default business rules
INSERT INTO public.business_rules (key, value, description) VALUES
  ('order', '{"payment_proof_max_size_mb": 5, "allowed_file_types": ["image/jpeg", "image/png"], "auto_cancel_hours": 24}', 'Order processing rules'),
  ('stock', '{"low_threshold": 10, "out_of_stock_alert": true}', 'Stock management rules'),
  ('support', '{"attachment_max_size_mb": 10, "auto_close_resolved_days": 7, "max_tickets_per_hour": 5}', 'Support ticket rules'),
  ('display', '{"products_per_page": 12, "testimonials_count": 6, "best_seller_period": "month"}', 'Display preferences')
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_business_rules_updated_at
  BEFORE UPDATE ON public.business_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();