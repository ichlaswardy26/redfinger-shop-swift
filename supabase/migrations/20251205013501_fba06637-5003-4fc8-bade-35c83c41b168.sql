-- Enable realtime for tables that need synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;