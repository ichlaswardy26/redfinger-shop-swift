-- Create web_settings table for admin customization
CREATE TABLE public.web_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.web_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings (for public site display)
CREATE POLICY "Anyone can view web settings"
ON public.web_settings FOR SELECT
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage web settings"
ON public.web_settings FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create ticket_messages table for ticket conversations
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for their own tickets
CREATE POLICY "Users can view own ticket messages"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

-- Staff/Admin can view all ticket messages
CREATE POLICY "Staff and admin can view all ticket messages"
ON public.ticket_messages FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')
);

-- Users can create messages for their own open tickets
CREATE POLICY "Users can create messages for own open tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
    AND support_tickets.status = 'open'
  )
);

-- Staff/Admin can create messages for open tickets
CREATE POLICY "Staff and admin can create messages for open tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')) AND
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = ticket_messages.ticket_id 
    AND support_tickets.status = 'open'
  )
);

-- Insert default web settings
INSERT INTO public.web_settings (key, value) VALUES
  ('hero', '{"title": "Premium Redfinger Cloud Phone Services", "subtitle": "Experience seamless cloud gaming and app automation with our reliable Redfinger subscriptions", "buttonText": "Browse Store", "secondaryButtonText": "Sign In"}'),
  ('features', '{"title": "Why Choose Us?", "subtitle": "Premium features for the best cloud phone experience", "items": [{"icon": "smartphone", "title": "Multiple Devices", "description": "Run multiple cloud phones simultaneously"}, {"icon": "cloud", "title": "24/7 Uptime", "description": "Always-on cloud infrastructure"}, {"icon": "shield", "title": "Secure & Reliable", "description": "Enterprise-grade security standards"}, {"icon": "zap", "title": "High Performance", "description": "Optimized for speed and efficiency"}]}'),
  ('cta', '{"title": "Ready to Get Started?", "subtitle": "Join thousands of satisfied customers using our premium Redfinger cloud phone services", "buttonText": "View Plans & Pricing"}'),
  ('contact', '{"email": "support@example.com", "phone": "+62 xxx-xxxx-xxxx", "whatsapp": "+62 xxx-xxxx-xxxx"}'),
  ('social', '{"facebook": "", "instagram": "", "twitter": "", "youtube": ""}'),
  ('footer', '{"copyrightText": "© 2024 Redfinger Store. All rights reserved.", "links": []}')
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for ticket messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;