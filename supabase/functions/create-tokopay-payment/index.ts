import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// MD5 hash function for signature
async function md5(message: string): Promise<string> {
  const { createHash } = await import("https://deno.land/std@0.177.0/node/crypto.ts");
  const hash = createHash("md5");
  hash.update(message);
  return hash.digest("hex") as string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { order_id, amount } = await req.json();
    
    if (!order_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing order_id or amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate order belongs to user and is pending
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, payment_status, payment_method, gateway_trx_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order fetch error:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access to this order" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.payment_status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Order is not pending payment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if payment already created
    if (order.gateway_trx_id && order.payment_method === "qris") {
      return new Response(
        JSON.stringify({ error: "Payment already created for this order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment gateway settings
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: gatewayConfig, error: configError } = await adminClient
      .from("business_rules")
      .select("value")
      .eq("key", "payment_gateway")
      .maybeSingle();

    if (configError) {
      console.error("Gateway config error:", configError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch payment gateway configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = gatewayConfig?.value as {
      enabled: boolean;
      provider: string;
      merchant_id: string;
      qris_enabled: boolean;
    } | null;

    if (!config?.enabled) {
      return new Response(
        JSON.stringify({ error: "Payment gateway is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.qris_enabled) {
      return new Response(
        JSON.stringify({ error: "QRIS payment method is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Tokopay credentials
    const merchantId = Deno.env.get("TOKOPAY_MERCHANT_ID") || config.merchant_id;
    const secretKey = Deno.env.get("TOKOPAY_SECRET_KEY");

    if (!merchantId || !secretKey) {
      console.error("Missing Tokopay credentials");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured properly" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signature: MD5(merchant_id:secret:ref_id)
    const signature = await md5(`${merchantId}:${secretKey}:${order_id}`);

    // Call Tokopay API
    const tokopayUrl = new URL("https://api.tokopay.id/v1/order");
    tokopayUrl.searchParams.append("merchant", merchantId);
    tokopayUrl.searchParams.append("secret", signature);
    tokopayUrl.searchParams.append("ref_id", order_id);
    tokopayUrl.searchParams.append("nominal", Math.round(amount).toString());
    tokopayUrl.searchParams.append("metode", "QRIS");

    console.log("Calling Tokopay API:", tokopayUrl.toString().replace(signature, "***"));

    const tokopayResponse = await fetch(tokopayUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const tokopayData = await tokopayResponse.json();
    console.log("Tokopay response:", JSON.stringify(tokopayData, null, 2));

    if (tokopayData.status !== "Success") {
      return new Response(
        JSON.stringify({ 
          error: tokopayData.error_msg || tokopayData.message || "Failed to create payment",
          details: tokopayData
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse expiry time
    let expiryTime: Date | null = null;
    if (tokopayData.data?.expired_time) {
      expiryTime = new Date(tokopayData.data.expired_time.replace(" ", "T") + "+07:00");
    } else {
      // Default 24 hours expiry
      expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 24);
    }

    // Update order with gateway data
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_method: "qris",
        gateway_trx_id: tokopayData.data.trx_id,
        payment_url: tokopayData.data.pay_url,
        qr_link: tokopayData.data.qr_link,
        gateway_expired_at: expiryTime.toISOString(),
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Order update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order with payment data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payment created successfully for order:", order_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          trx_id: tokopayData.data.trx_id,
          qr_link: tokopayData.data.qr_link,
          qr_string: tokopayData.data.qr_string,
          pay_url: tokopayData.data.pay_url,
          nominal: tokopayData.data.nominal,
          expired_at: expiryTime.toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
