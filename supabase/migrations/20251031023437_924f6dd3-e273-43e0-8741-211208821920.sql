-- Add quantity column to orders table
ALTER TABLE public.orders 
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure positive quantity
ALTER TABLE public.orders 
ADD CONSTRAINT positive_quantity CHECK (quantity > 0);

-- Change redeem_code to redeem_codes array
ALTER TABLE public.orders 
ADD COLUMN redeem_codes TEXT[];

-- Copy existing redeem_code data to redeem_codes array
UPDATE public.orders 
SET redeem_codes = ARRAY[redeem_code] 
WHERE redeem_code IS NOT NULL;

-- Drop old redeem_code column
ALTER TABLE public.orders 
DROP COLUMN redeem_code;