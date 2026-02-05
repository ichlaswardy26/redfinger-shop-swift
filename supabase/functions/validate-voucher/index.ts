 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 }
 
 interface ValidateRequest {
   code: string
   order_amount: number
   product_id: string
   category_id?: string
 }
 
 interface Voucher {
   id: string
   code: string
   name: string
   discount_type: 'percentage' | 'fixed'
   discount_value: number
   min_order_amount: number
   max_discount_amount: number | null
   usage_limit: number | null
   usage_count: number
   per_user_limit: number
   valid_from: string
   valid_until: string
   is_active: boolean
   applies_to: 'all' | 'products' | 'categories'
   product_ids: string[] | null
   category_ids: string[] | null
   stackable: boolean
   first_order_only: boolean
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
 
     // Get user from auth header
     const authHeader = req.headers.get('Authorization')
     if (!authHeader) {
       return new Response(
         JSON.stringify({ valid: false, error: 'Authentication required' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Create client for user verification
     const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } }
     })
 
     const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
     if (userError || !user) {
       return new Response(
         JSON.stringify({ valid: false, error: 'Invalid authentication' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Service client for admin operations
     const supabase = createClient(supabaseUrl, supabaseServiceKey)
 
     const { code, order_amount, product_id, category_id }: ValidateRequest = await req.json()
 
     // Validate input
     if (!code || !order_amount || !product_id) {
       return new Response(
         JSON.stringify({ valid: false, error: 'Missing required fields' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const cleanCode = code.toUpperCase().trim()
     console.log(`Validating voucher: ${cleanCode} for user: ${user.id}`)
 
     // Fetch voucher
     const { data: voucher, error: voucherError } = await supabase
       .from('vouchers')
       .select('*')
       .eq('code', cleanCode)
       .single()
 
     if (voucherError || !voucher) {
       console.log('Voucher not found:', cleanCode)
       return new Response(
         JSON.stringify({ valid: false, error: 'Voucher code not found' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const v = voucher as Voucher
 
     // Check if active
     if (!v.is_active) {
       return new Response(
         JSON.stringify({ valid: false, error: 'Voucher is inactive' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Check validity period
     const now = new Date()
     const validFrom = new Date(v.valid_from)
     const validUntil = new Date(v.valid_until)
 
     if (now < validFrom) {
       return new Response(
         JSON.stringify({ valid: false, error: 'Voucher is not yet active' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     if (now > validUntil) {
       return new Response(
         JSON.stringify({ valid: false, error: 'Voucher has expired' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Check usage limit
     if (v.usage_limit !== null && v.usage_count >= v.usage_limit) {
       return new Response(
         JSON.stringify({ valid: false, error: 'Voucher usage limit reached' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Check per-user limit
     const { count: userUsageCount } = await supabase
       .from('voucher_usage')
       .select('id', { count: 'exact', head: true })
       .eq('voucher_id', v.id)
       .eq('user_id', user.id)
 
     if (userUsageCount !== null && userUsageCount >= v.per_user_limit) {
       return new Response(
         JSON.stringify({ valid: false, error: 'You have already used this voucher' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Check minimum order amount
     if (v.min_order_amount && order_amount < v.min_order_amount) {
       return new Response(
         JSON.stringify({ 
           valid: false, 
           error: `Minimum order amount is Rp ${v.min_order_amount.toLocaleString()}` 
         }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Check product/category targeting
     if (v.applies_to === 'products' && v.product_ids && v.product_ids.length > 0) {
       if (!v.product_ids.includes(product_id)) {
         return new Response(
           JSON.stringify({ valid: false, error: 'Voucher not applicable for this product' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         )
       }
     }
 
     if (v.applies_to === 'categories' && v.category_ids && v.category_ids.length > 0) {
       if (!category_id || !v.category_ids.includes(category_id)) {
         return new Response(
           JSON.stringify({ valid: false, error: 'Voucher not applicable for this category' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         )
       }
     }
 
     // Check first order only
     if (v.first_order_only) {
       const { count: orderCount } = await supabase
         .from('orders')
         .select('id', { count: 'exact', head: true })
         .eq('user_id', user.id)
         .eq('payment_status', 'verified')
 
       if (orderCount !== null && orderCount > 0) {
         return new Response(
           JSON.stringify({ valid: false, error: 'This voucher is for first-time customers only' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         )
       }
     }
 
     // Calculate discount
     let discountAmount = 0
     if (v.discount_type === 'percentage') {
       discountAmount = (order_amount * v.discount_value) / 100
       // Apply max discount cap
       if (v.max_discount_amount !== null && discountAmount > v.max_discount_amount) {
         discountAmount = v.max_discount_amount
       }
     } else {
       discountAmount = v.discount_value
     }
 
     // Ensure discount doesn't exceed order amount
     discountAmount = Math.min(discountAmount, order_amount)
 
     const finalAmount = order_amount - discountAmount
 
     console.log(`Voucher ${cleanCode} valid. Discount: ${discountAmount}, Final: ${finalAmount}`)
 
     return new Response(
       JSON.stringify({
         valid: true,
         voucher: {
           id: v.id,
           code: v.code,
           name: v.name,
           discount_type: v.discount_type,
           discount_value: v.discount_value,
           max_discount_amount: v.max_discount_amount
         },
         discount_amount: discountAmount,
         original_amount: order_amount,
         final_amount: finalAmount
       }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
 
   } catch (error) {
     console.error('Voucher validation error:', error)
     return new Response(
       JSON.stringify({ valid: false, error: 'Failed to validate voucher' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
   }
 })