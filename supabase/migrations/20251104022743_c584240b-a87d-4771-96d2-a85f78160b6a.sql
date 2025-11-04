-- Add length constraints to prevent storage exhaustion
ALTER TABLE support_tickets ADD CONSTRAINT subject_length CHECK (length(subject) <= 200);
ALTER TABLE support_tickets ADD CONSTRAINT description_length CHECK (length(description) <= 5000);
ALTER TABLE product_ratings ADD CONSTRAINT review_length CHECK (review IS NULL OR length(review) <= 2000);
ALTER TABLE stock_logs ADD CONSTRAINT reason_length CHECK (length(reason) <= 500);
ALTER TABLE products ADD CONSTRAINT name_length CHECK (length(name) <= 100);
ALTER TABLE products ADD CONSTRAINT description_length CHECK (description IS NULL OR length(description) <= 1000);
ALTER TABLE products ADD CONSTRAINT price_range CHECK (price > 0 AND price <= 999999);
ALTER TABLE products ADD CONSTRAINT duration_range CHECK (duration_days > 0 AND duration_days <= 365);

-- Prevent ticket spam with rate limiting
CREATE OR REPLACE FUNCTION check_ticket_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM support_tickets 
      WHERE user_id = NEW.user_id 
      AND created_at > NOW() - INTERVAL '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 5 tickets per hour';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ticket_rate_limit
BEFORE INSERT ON support_tickets
FOR EACH ROW EXECUTE FUNCTION check_ticket_rate_limit();