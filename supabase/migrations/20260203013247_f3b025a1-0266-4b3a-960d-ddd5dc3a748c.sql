-- Add parent_id column to product_categories for nested category support
ALTER TABLE product_categories
ADD COLUMN parent_id uuid REFERENCES product_categories(id) ON DELETE SET NULL;

-- Create index for better query performance on hierarchical lookups
CREATE INDEX idx_product_categories_parent_id ON product_categories(parent_id);