import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_order" | "order_verified" | "order_rejected" | "new_ticket" | "ticket_response";
  orderId?: string;
  ticketId?: string;
  recipientEmail?: string;
  recipientName?: string;
  additionalData?: Record<string, any>;
}

const getEmailTemplate = (type: string, data: Record<string, any>) => {
  const templates: Record<string, { subject: string; html: string }> = {
    new_order: {
      subject: `New Order Received - ${data.productName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Order Received</h1>
          <p>A new order has been placed and is awaiting payment verification.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Customer:</strong> ${data.customerName || 'N/A'}</p>
            <p><strong>Email:</strong> ${data.customerEmail}</p>
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Quantity:</strong> ${data.quantity}</p>
            <p><strong>Order ID:</strong> ${data.orderId}</p>
          </div>
          <p>Please review and verify the payment proof in the admin dashboard.</p>
        </div>
      `,
    },
    order_verified: {
      subject: `Your Order Has Been Verified - ${data.productName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Order Verified!</h1>
          <p>Great news! Your order has been verified and your redeem codes are now available.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Quantity:</strong> ${data.quantity}</p>
            <p><strong>Order ID:</strong> ${data.orderId}</p>
          </div>
          <p>Please log in to your account to view and use your redeem codes.</p>
          <p style="color: #666; font-size: 14px;">Thank you for your purchase!</p>
        </div>
      `,
    },
    order_rejected: {
      subject: `Order Update - Action Required`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Order Rejected</h1>
          <p>Unfortunately, your order could not be verified.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Order ID:</strong> ${data.orderId}</p>
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          </div>
          <p>A support ticket has been created for this issue. Please check your tickets or contact our support team for assistance.</p>
        </div>
      `,
    },
    new_ticket: {
      subject: `New Support Ticket - ${data.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Support Ticket</h1>
          <p>A new support ticket has been submitted.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${data.customerName || data.customerEmail}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Description:</strong></p>
            <p style="white-space: pre-wrap;">${data.description}</p>
          </div>
          <p>Please review and respond to this ticket in the admin dashboard.</p>
        </div>
      `,
    },
    ticket_response: {
      subject: `Response to Your Support Ticket - ${data.subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Support Ticket Update</h1>
          <p>You have received a response to your support ticket.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Response:</strong></p>
            <p style="white-space: pre-wrap;">${data.message}</p>
          </div>
          <p>Please log in to your account to view the full conversation and reply.</p>
        </div>
      `,
    },
  };

  return templates[type] || { subject: "Notification", html: "<p>You have a new notification.</p>" };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch site name from web_settings
    let siteName = "Cloud Phone Store";
    const { data: siteData } = await supabaseClient
      .from("web_settings")
      .select("value")
      .eq("key", "site")
      .maybeSingle();
    
    if (siteData?.value && typeof siteData.value === 'object' && 'name' in siteData.value) {
      siteName = (siteData.value as { name: string }).name;
    }

    const { type, orderId, ticketId, recipientEmail, recipientName, additionalData }: NotificationRequest = await req.json();
    
    console.log(`Processing notification: ${type}`, { orderId, ticketId, recipientEmail });

    let emailData: Record<string, any> = { ...additionalData };
    let toEmail = recipientEmail;

    // Fetch order details if orderId provided
    if (orderId) {
      const { data: order } = await supabaseClient
        .from("orders")
        .select("*, products(name)")
        .eq("id", orderId)
        .single();

      if (order) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", order.user_id)
          .single();

        emailData = {
          ...emailData,
          orderId: order.id,
          productName: order.products?.name || "Unknown",
          quantity: order.quantity,
          customerEmail: profile?.email,
          customerName: profile?.full_name,
        };

        if (!toEmail && profile?.email) {
          toEmail = profile.email;
        }
      }
    }

    // Fetch ticket details if ticketId provided
    if (ticketId) {
      const { data: ticket } = await supabaseClient
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (ticket) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", ticket.user_id)
          .single();

        emailData = {
          ...emailData,
          ticketId: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          customerEmail: profile?.email,
          customerName: profile?.full_name,
        };

        if (!toEmail && profile?.email) {
          toEmail = profile.email;
        }
      }
    }

    // For admin notifications, get admin emails
    if (type === "new_order" || type === "new_ticket") {
      const { data: adminRoles } = await supabaseClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map(r => r.user_id);
        const { data: adminProfiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", adminIds);

        if (adminProfiles && adminProfiles.length > 0) {
          toEmail = adminProfiles[0].email; // Send to first admin
        }
      }
    }

    if (!toEmail) {
      console.log("No recipient email found, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const template = getEmailTemplate(type, emailData);

    const emailResponse = await resend.emails.send({
      from: `${siteName} <onboarding@resend.dev>`,
      to: [toEmail],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
