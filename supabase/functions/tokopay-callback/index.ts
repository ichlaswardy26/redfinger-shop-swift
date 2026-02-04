import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// MD5 hash function for signature validation
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

  console.log("Tokopay callback received");

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get Tokopay credentials
    const merchantId = Deno.env.get("TOKOPAY_MERCHANT_ID");
    const secretKey = Deno.env.get("TOKOPAY_SECRET_KEY");

    if (!merchantId || !secretKey) {
      console.error("Missing Tokopay credentials");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse callback data - support both JSON and form-urlencoded
    let callbackData: {
      status: string;
      trx_id: string;
      ref_id: string;
      amount?: number;
      nominal?: number;
      signature: string;
    };

    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      callbackData = await req.json();
    } else {
      // Parse form-urlencoded or query params
      const body = await req.text();
      const params = new URLSearchParams(body || req.url.split("?")[1] || "");
      callbackData = {
        status: params.get("status") || "",
        trx_id: params.get("trx_id") || "",
        ref_id: params.get("ref_id") || "",
        amount: parseInt(params.get("amount") || params.get("nominal") || "0"),
        signature: params.get("signature") || "",
      };
    }

    console.log("Callback data:", JSON.stringify(callbackData, null, 2));

    const { status, trx_id, ref_id, signature } = callbackData;

    if (!status || !trx_id || !ref_id) {
      console.error("Missing required callback fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate signature: MD5(merchant_id:secret:ref_id)
    const expectedSignature = await md5(`${merchantId}:${secretKey}:${ref_id}`);
    
    if (signature && signature !== expectedSignature) {
      console.error("Invalid signature. Expected:", expectedSignature, "Got:", signature);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order by ref_id (order_id)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id, 
        user_id, 
        product_id, 
        quantity, 
        payment_status, 
        payment_method,
        gateway_trx_id,
        products:product_id (id, name, stock, auto_delivery)
      `)
      .eq("id", ref_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify this is a QRIS order with matching trx_id
    if (order.payment_method !== "qris") {
      console.error("Order is not a QRIS payment");
      return new Response(
        JSON.stringify({ error: "Invalid payment method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.gateway_trx_id !== trx_id) {
      console.error("Transaction ID mismatch");
      return new Response(
        JSON.stringify({ error: "Transaction ID mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already processed?
    if (order.payment_status === "verified") {
      console.log("Order already verified, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process based on status
    if (status === "Paid" || status === "Success") {
      console.log("Processing successful payment for order:", ref_id);

      // Get payment gateway settings for auto_delivery
      const { data: gatewayConfig } = await supabase
        .from("business_rules")
        .select("value")
        .eq("key", "payment_gateway")
        .maybeSingle();

      const config = gatewayConfig?.value as { auto_delivery?: boolean } | null;
      const autoDelivery = config?.auto_delivery ?? true;

      let redeemCodes: string[] = [];

      // Check if product has auto_delivery enabled and we should auto-deliver
      const product = order.products as unknown as { id: string; name: string; stock: number; auto_delivery: boolean };
      
      if (autoDelivery && product?.auto_delivery) {
        console.log("Auto-delivery enabled, fetching codes from inventory");
        
        // Fetch available codes from inventory
        const { data: availableCodes, error: codesError } = await supabase
          .from("redeem_code_inventory")
          .select("id, code")
          .eq("product_id", order.product_id)
          .eq("is_used", false)
          .limit(order.quantity);

        if (codesError) {
          console.error("Error fetching codes:", codesError);
        } else if (availableCodes && availableCodes.length >= order.quantity) {
          redeemCodes = availableCodes.map(c => c.code);
          
          // Mark codes as used
          const codeIds = availableCodes.map(c => c.id);
          const { error: markError } = await supabase
            .from("redeem_code_inventory")
            .update({
              is_used: true,
              used_at: new Date().toISOString(),
              order_id: order.id,
            })
            .in("id", codeIds);

          if (markError) {
            console.error("Error marking codes as used:", markError);
            redeemCodes = []; // Reset if failed
          } else {
            console.log("Assigned", redeemCodes.length, "codes to order");
          }
        } else {
          console.log("Not enough codes in inventory, skipping auto-delivery");
        }
      }

      // Update order to verified
      const updateData: Record<string, unknown> = {
        payment_status: "verified",
        status: "active",
        verified_at: new Date().toISOString(),
      };

      if (redeemCodes.length > 0) {
        updateData.redeem_codes = redeemCodes;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id);

      if (updateError) {
        console.error("Error updating order:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reduce product stock
      if (product) {
        const newStock = Math.max(0, product.stock - order.quantity);
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", order.product_id);

        if (stockError) {
          console.error("Error updating stock:", stockError);
        } else {
          console.log("Stock reduced from", product.stock, "to", newStock);

          // Log stock change
          await supabase.from("stock_logs").insert({
            product_id: order.product_id,
            user_id: order.user_id,
            operation: "reduce",
            quantity: order.quantity,
            previous_stock: product.stock,
            new_stock: newStock,
            reason: "auto_payment",
            notes: `Auto-verified via QRIS payment (${trx_id})`,
          });
        }
      }

      // Send notification email
      try {
        const functionUrl = `${supabaseUrl}/functions/v1/send-notification`;
        await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            type: "payment_verified",
            user_id: order.user_id,
            order_id: order.id,
            product_name: product?.name,
            quantity: order.quantity,
            redeem_codes: redeemCodes,
          }),
        });
        console.log("Notification sent");
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      console.log("Order verified successfully:", order.id);
      return new Response(
        JSON.stringify({ success: true, message: "Payment verified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (status === "Failed" || status === "Expired") {
      console.log("Payment failed/expired for order:", ref_id);
      
      // Update order to reflect failed status
      await supabase
        .from("orders")
        .update({
          payment_status: "pending", // Keep as pending so user can retry
          admin_notes: `QRIS payment ${status.toLowerCase()} at ${new Date().toISOString()}`,
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({ success: true, message: "Status recorded" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Callback received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
