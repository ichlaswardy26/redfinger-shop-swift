-- Add payment verification columns to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_status text NOT NULL DEFAULT 'pending',
ADD COLUMN payment_proof text,
ADD COLUMN admin_notes text,
ADD COLUMN verified_at timestamp with time zone,
ADD COLUMN verified_by uuid REFERENCES auth.users(id);

-- Add check constraint for payment_status
ALTER TABLE public.orders 
ADD CONSTRAINT valid_payment_status 
CHECK (payment_status IN ('pending', 'verified', 'rejected'));

-- Update the redeem_code to be nullable initially (set by admin after verification)
ALTER TABLE public.orders 
ALTER COLUMN redeem_code DROP NOT NULL;

-- Update orders status to reflect payment verification
COMMENT ON COLUMN public.orders.payment_status IS 'Payment verification status: pending, verified, or rejected';
COMMENT ON COLUMN public.orders.payment_proof IS 'URL or path to payment proof screenshot/document';

-- Allow admins to update payment verification
CREATE POLICY "Admins can verify payments"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to upload payment proof for their orders
CREATE POLICY "Users can update own order payment proof"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id AND payment_status = 'pending')
WITH CHECK (auth.uid() = user_id);

-- Update the existing select policies to show order status
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));