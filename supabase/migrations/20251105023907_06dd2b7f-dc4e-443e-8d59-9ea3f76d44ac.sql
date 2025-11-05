-- Implement assignment-based access control for staff
-- This restricts staff to only see tickets assigned to them or unassigned tickets
-- and orders related to those tickets

-- Drop the overly permissive staff policies
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins and staff can view all tickets" ON support_tickets;

-- Create new restrictive policy for staff ticket access
-- Staff can only view tickets assigned to them or unassigned tickets
CREATE POLICY "Staff view assigned or unassigned tickets"
ON support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'staff'::app_role) AND 
   (assigned_to = auth.uid() OR assigned_to IS NULL))
);

-- Create new restrictive policy for staff order access
-- Staff can only view orders if there's a ticket assigned to them for that order
CREATE POLICY "Staff view ticket-related orders"
ON orders FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'staff'::app_role) AND 
   EXISTS (
     SELECT 1 FROM support_tickets 
     WHERE order_id = orders.id 
     AND assigned_to = auth.uid()
   ))
);

-- Keep the existing admin policy for tickets (already covered by new policy above)
-- The admin check is included in the new policies

-- Keep existing update policy for tickets (staff can update assigned tickets)
-- This is already properly restricted by the existing policy