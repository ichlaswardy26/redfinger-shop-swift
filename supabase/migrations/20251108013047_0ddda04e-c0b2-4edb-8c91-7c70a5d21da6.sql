-- Add unique constraint to ensure one rating per product per user
ALTER TABLE product_ratings 
ADD CONSTRAINT unique_user_product_rating 
UNIQUE (user_id, product_id);