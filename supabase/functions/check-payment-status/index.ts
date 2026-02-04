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
    const { order_id } = await req.json();
    
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "Missing order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, payment_status, payment_method, gateway_trx_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already verified, return immediately
    if (order.payment_status === "verified") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "verified",
          message: "Payment already verified" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If not a QRIS payment, return current status
    if (order.payment_method !== "qris" || !order.gateway_trx_id) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: order.payment_status,
          message: "Not a QRIS payment" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Tokopay credentials
    const merchantId = Deno.env.get("TOKOPAY_MERCHANT_ID");
    const secretKey = Deno.env.get("TOKOPAY_SECRET_KEY");

    if (!merchantId || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signature for check status
    const signature = await md5(`${merchantId}:${secretKey}:${order_id}`);

    // Call Tokopay check status API
    const tokopayUrl = new URL("https://api.tokopay.id/v1/order/check");
    tokopayUrl.searchParams.append("merchant", merchantId);
    tokopayUrl.searchParams.append("secret", signature);
    tokopayUrl.searchParams.append("ref_id", order_id);

    console.log("Checking payment status for order:", order_id);

    const tokopayResponse = await fetch(tokopayUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const tokopayData = await tokopayResponse.json();
    console.log("Tokopay status response:", JSON.stringify(tokopayData, null, 2));

    if (tokopayData.status === "Success" && tokopayData.data) {
      const paymentStatus = tokopayData.data.status;
      
      // If paid, trigger the callback flow
      if (paymentStatus === "Paid" || paymentStatus === "Success") {
        console.log("Payment confirmed, triggering verification");
        
        // Call the callback function to process the payment
        const callbackUrl = `${supabaseUrl}/functions/v1/tokopay-callback`;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        
        await fetch(callbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            status: "Paid",
            trx_id: order.gateway_trx_id,
            ref_id: order_id,
            signature: signature,
          }),
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: "verified",
            message: "Payment verified successfully" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: paymentStatus.toLowerCase(),
          message: `Payment status: ${paymentStatus}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: order.payment_status,
        message: "Status check completed" 
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
