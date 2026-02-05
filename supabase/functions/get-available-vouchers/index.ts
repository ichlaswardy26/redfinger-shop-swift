 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface VoucherRequest {
   order_amount: number;
   product_id: string;
   category_id?: string;
 }
 
 interface AvailableVoucher {
   id: string;
   code: string;
   name: string;
   description: string | null;
   discount_type: "percentage" | "fixed";
   discount_value: number;
   max_discount_amount: number | null;
   min_order_amount: number | null;
   potential_discount: number;
   first_order_only: boolean;
   valid_until: string;
 }
 
 function calculateDiscount(
   orderAmount: number,
   discountType: string,
   discountValue: number,
   maxDiscountAmount: number | null
 ): number {
   let discount = 0;
   
   if (discountType === "percentage") {
     discount = Math.floor((orderAmount * discountValue) / 100);
     if (maxDiscountAmount && discount > maxDiscountAmount) {
       discount = maxDiscountAmount;
     }
   } else {
     discount = discountValue;
   }
   
   return Math.min(discount, orderAmount);
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight requests
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(
         JSON.stringify({ error: "Unauthorized", vouchers: [] }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_ANON_KEY")!,
       { global: { headers: { Authorization: authHeader } } }
     );
 
     const token = authHeader.replace("Bearer ", "");
     const { data: claims, error: authError } = await supabase.auth.getClaims(token);
     
     if (authError || !claims?.claims) {
       return new Response(
         JSON.stringify({ error: "Unauthorized", vouchers: [] }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const userId = claims.claims.sub as string;
     const body: VoucherRequest = await req.json();
     const { order_amount, product_id, category_id } = body;
 
     console.log("Fetching available vouchers for user:", userId, "order:", order_amount);
 
     // Fetch all active vouchers within validity period
     const now = new Date().toISOString();
     const { data: vouchers, error: voucherError } = await supabase
       .from("vouchers")
       .select("*")
       .eq("is_active", true)
       .lte("valid_from", now)
       .gte("valid_until", now);
 
     if (voucherError) {
       console.error("Error fetching vouchers:", voucherError);
       return new Response(
         JSON.stringify({ error: "Failed to fetch vouchers", vouchers: [] }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     if (!vouchers || vouchers.length === 0) {
       return new Response(
         JSON.stringify({ vouchers: [] }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Fetch user's voucher usage for per_user_limit check
     const { data: userUsage, error: usageError } = await supabase
       .from("voucher_usage")
       .select("voucher_id")
       .eq("user_id", userId);
 
     if (usageError) {
       console.error("Error fetching user usage:", usageError);
     }
 
     const usageByVoucher: Record<string, number> = {};
     userUsage?.forEach((u) => {
       usageByVoucher[u.voucher_id] = (usageByVoucher[u.voucher_id] || 0) + 1;
     });
 
     // Check if user has any completed orders (for first_order_only)
     const { data: userOrders, error: ordersError } = await supabase
       .from("orders")
       .select("id")
       .eq("user_id", userId)
       .eq("payment_status", "verified")
       .limit(1);
 
     if (ordersError) {
       console.error("Error fetching user orders:", ordersError);
     }
 
     const hasCompletedOrders = (userOrders?.length || 0) > 0;
 
     // Filter and calculate eligible vouchers
     const eligibleVouchers: AvailableVoucher[] = [];
 
     for (const voucher of vouchers) {
       // Check usage limit
       if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
         continue;
       }
 
       // Check min order amount
       if (voucher.min_order_amount && order_amount < voucher.min_order_amount) {
         continue;
       }
 
       // Check per user limit
       if (voucher.per_user_limit) {
         const userUsageCount = usageByVoucher[voucher.id] || 0;
         if (userUsageCount >= voucher.per_user_limit) {
           continue;
         }
       }
 
       // Check first order only
       if (voucher.first_order_only && hasCompletedOrders) {
         continue;
       }
 
       // Check product/category targeting
       if (voucher.applies_to === "specific_products") {
         if (!voucher.product_ids || !voucher.product_ids.includes(product_id)) {
           continue;
         }
       } else if (voucher.applies_to === "specific_categories") {
         if (!category_id || !voucher.category_ids || !voucher.category_ids.includes(category_id)) {
           continue;
         }
       }
 
       // Calculate potential discount
       const potentialDiscount = calculateDiscount(
         order_amount,
         voucher.discount_type,
         voucher.discount_value,
         voucher.max_discount_amount
       );
 
       eligibleVouchers.push({
         id: voucher.id,
         code: voucher.code,
         name: voucher.name,
         description: voucher.description,
         discount_type: voucher.discount_type as "percentage" | "fixed",
         discount_value: voucher.discount_value,
         max_discount_amount: voucher.max_discount_amount,
         min_order_amount: voucher.min_order_amount,
         potential_discount: potentialDiscount,
         first_order_only: voucher.first_order_only,
         valid_until: voucher.valid_until,
       });
     }
 
     // Sort by potential discount (best first), limit to 5
     eligibleVouchers.sort((a, b) => b.potential_discount - a.potential_discount);
     const topVouchers = eligibleVouchers.slice(0, 5);
 
     console.log(`Found ${topVouchers.length} eligible vouchers for user ${userId}`);
 
     return new Response(
       JSON.stringify({ vouchers: topVouchers }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("Error in get-available-vouchers:", error);
     return new Response(
       JSON.stringify({ error: "Internal server error", vouchers: [] }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });