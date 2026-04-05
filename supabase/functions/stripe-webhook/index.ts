import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditPurchaseEmail, paymentFailedEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_CREDITS: Record<string, number> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": 120,  // annual (legacy)
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": 100,  // annual_100
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": 200,  // annual_200
  "price_1THT7jF9ZCIiqrz6i02J4bj4": 300,  // annual_300
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": 500,  // annual_500
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": 1000, // annual_1000
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": 3,    // monthly
};

const PRICE_PLAN: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "Annual",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "Annual",
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "Annual",
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "Annual",
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "Annual",
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "Annual",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "Monthly",
};

// Helper: find profile by stripe_customer_id with email fallback
async function findProfileByCustomerId(
  supabase: any,
  stripe: any,
  customerId: string,
): Promise<{ user_id: string; available_credits: number } | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, available_credits")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) return profile;

  // Fallback: email lookup for legacy users
  console.warn(`[WEBHOOK] No profile for customer ${customerId} — trying email fallback`);
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  if (customer.email) {
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(customer.email);
    if (authUser?.user) {
      // Save stripe_customer_id for future lookups
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", authUser.user.id);
      
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, available_credits")
        .eq("user_id", authUser.user.id)
        .single();
      return p;
    }
  }
  return null;
}

// Helper: get customer ID from an invoice (handles both old and new API shapes)
function getInvoiceCustomerId(invoice: any): string {
  return typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id ?? "";
}

// Helper: get price ID from invoice lines
function getInvoicePriceId(invoice: any): string | undefined {
  return invoice.lines?.data?.[0]?.price?.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2026-02-25.clover",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret || !sig) {
      console.error("[WEBHOOK] Missing webhook secret or signature");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured or signature missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Use constructEventAsync for Deno compatibility
    const event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);

    console.log(`[WEBHOOK] Received event: ${event.type}`);

    // ── checkout.session.completed ──────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId   = session.metadata?.user_id;
      const credits  = parseInt(session.metadata?.credits || "0", 10);
      const planId   = session.metadata?.plan_id || "unknown";

      if (userId && credits > 0) {
        await addCredits(supabase, userId, credits, `Compra plan ${planId}: +${credits} créditos`);

        const planMap: Record<string, string> = { annual: "Annual", monthly: "Monthly" };
        const planName = planMap[planId];
        if (planName) {
          await supabase
            .from("profiles")
            .update({ subscription_plan: planName })
            .eq("user_id", userId);
          console.log(`[WEBHOOK] Updated subscription_plan to ${planName} for user ${userId}`);
        }

        // Guardar stripe_customer_id para evitar listUsers() en futuros eventos
        let resolvedCustomerId: string | undefined;
        if (session.customer) {
          resolvedCustomerId = typeof session.customer === "string"
            ? session.customer
            : session.customer.id;
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: resolvedCustomerId })
            .eq("user_id", userId);
          console.log(`[WEBHOOK] Saved stripe_customer_id ${resolvedCustomerId} for user ${userId}`);
        }

        // Send purchase confirmation email
        try {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
          if (authUser?.email) {
            const displayName = authUser.user_metadata?.display_name || authUser.email.split("@")[0];
            // Try to get invoice URL from Stripe
            let invoiceUrl: string | undefined;
            if (resolvedCustomerId) {
              try {
                const invoices = await stripe.invoices.list({ customer: resolvedCustomerId, limit: 1 });
                if (invoices.data[0]?.hosted_invoice_url) {
                  invoiceUrl = invoices.data[0].hosted_invoice_url;
                }
              } catch (e) { console.warn("[WEBHOOK] Could not fetch invoice URL:", e); }
            }
            const email = creditPurchaseEmail({
              name: displayName,
              planName: planMap[planId] || planId,
              credits,
              invoiceUrl,
            });
            const messageId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({
              message_id: messageId, template_name: "credit_purchase", recipient_email: authUser.email, status: "pending",
            });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `credit-purchase-${messageId}`, message_id: messageId,
                to: authUser.email, from: "MusicDibs <noreply@notify.musicdibs.com>",
                sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "credit_purchase",
                queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] Purchase confirmation email enqueued for ${authUser.email}`);
          }
        } catch (emailErr) {
          console.error("[WEBHOOK] Error enqueuing purchase email:", emailErr);
        }
      }
    }

    // ── invoice.payment_succeeded / invoice_payment.paid (renovaciones) ─
    if (event.type === "invoice.payment_succeeded" || event.type === "invoice_payment.paid") {
      const obj = event.data.object as any;

      // For invoice_payment.paid, we need to fetch the invoice to get customer & lines
      let customerId: string;
      let billingReason: string | null = null;
      let priceId: string | undefined;

      if (event.type === "invoice_payment.paid") {
        // New clover API: obj is an InvoicePayment, fetch the invoice
        const invoiceId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        if (invoiceId) {
          const invoice = await stripe.invoices.retrieve(invoiceId);
          customerId = getInvoiceCustomerId(invoice);
          billingReason = invoice.billing_reason as string | null;
          priceId = getInvoicePriceId(invoice);
        } else {
          console.warn("[WEBHOOK] invoice_payment.paid: no invoice ID found");
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Legacy API: obj is the invoice itself
        const invoice = obj;
        customerId = getInvoiceCustomerId(invoice);
        billingReason = invoice.billing_reason;
        priceId = getInvoicePriceId(invoice);
      }

      if (billingReason === "subscription_cycle") {
        const profile = await findProfileByCustomerId(supabase, stripe, customerId);

        if (profile) {
          const credits = priceId ? (PRICE_CREDITS[priceId] || 0) : 0;

          if (credits > 0) {
            await supabase
              .from("profiles")
              .update({ available_credits: credits })
              .eq("user_id", profile.user_id);

            await supabase.from("credit_transactions").insert({
              user_id:     profile.user_id,
              amount:      credits,
              type:        "renewal",
              description: `Renovación de suscripción: créditos reiniciados a ${credits}`,
            });
            console.log(`[WEBHOOK] Reset credits to ${credits} for user ${profile.user_id} (renewal)`);
          }
        } else {
          console.warn(`[WEBHOOK] payment_succeeded: no profile found for customer ${customerId}`);
        }
      }
    }

    // ── invoice.payment_failed / invoice_payment.failed ──────────────────
    if (event.type === "invoice.payment_failed" || event.type === "invoice_payment.failed") {
      const obj = event.data.object as any;

      let customerId: string;
      let attemptCount: number;
      let nextAttempt: string | null;

      if (event.type === "invoice_payment.failed") {
        const invoiceId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        if (invoiceId) {
          const invoice = await stripe.invoices.retrieve(invoiceId);
          customerId = getInvoiceCustomerId(invoice);
          attemptCount = invoice.attempt_count ?? 0;
          nextAttempt = invoice.next_payment_attempt
            ? new Date((invoice.next_payment_attempt as number) * 1000).toISOString()
            : null;
        } else {
          console.warn("[WEBHOOK] invoice_payment.failed: no invoice ID found");
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const invoice = obj;
        customerId = getInvoiceCustomerId(invoice);
        attemptCount = invoice.attempt_count;
        nextAttempt = invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null;
      }

      const profile = await findProfileByCustomerId(supabase, stripe, customerId);

      if (profile) {
        const description = `Fallo en cobro de suscripción (intento ${attemptCount})${nextAttempt ? `. Próximo reintento: ${nextAttempt}` : ". No hay más reintentos."}`;

        await supabase.from("credit_transactions").insert({
          user_id:     profile.user_id,
          amount:      0,
          type:        "payment_failed",
          description,
        });
        console.log(`[WEBHOOK] Payment failed for user ${profile.user_id} (attempt ${attemptCount})`);

        // Send email notification via pgmq queue
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const userEmail = customer.email || "";
          const userName  = customer.name || userEmail;

          if (userEmail) {
            const email = paymentFailedEmail({
              name: userName,
              description,
              attemptCount,
              nextAttempt,
            });
            const messageId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({
              message_id: messageId, template_name: "payment_failed", recipient_email: userEmail, status: "pending",
            });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                run_id: crypto.randomUUID(), message_id: messageId,
                to: userEmail, from: "MusicDibs <noreply@notify.musicdibs.com>",
                sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "payment_failed",
                queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] Payment failure email enqueued for ${userEmail}`);

            // Also notify admin
            const adminMessageId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({
              message_id: adminMessageId, template_name: "payment_failed_admin", recipient_email: "info@musicdibs.com", status: "pending",
            });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                run_id: crypto.randomUUID(), message_id: adminMessageId,
                to: "info@musicdibs.com", from: "MusicDibs <noreply@notify.musicdibs.com>",
                sender_domain: "notify.musicdibs.com",
                subject: `⚠️ Fallo de pago — ${userEmail}`,
                html: email.html, text: email.text,
                purpose: "transactional", label: "payment_failed_admin",
                queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] Payment failure admin notification enqueued`);
          }
        } catch (emailErr) {
          console.error("[WEBHOOK] Error enqueuing payment failure email:", emailErr);
        }
      } else {
        console.warn(`[WEBHOOK] payment_failed: no profile found for customer ${customerId}`);
      }
    }

    // ── customer.subscription.updated (cambio de plan externo) ──────────
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId   = typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer as any)?.id ?? "";
      const priceId      = subscription.items?.data?.[0]?.price?.id;
      const status       = subscription.status;

      const profile = await findProfileByCustomerId(supabase, stripe, customerId);

      if (profile) {
        const planName = priceId ? (PRICE_PLAN[priceId] || null) : null;

        if (status === "active" && planName) {
          await supabase
            .from("profiles")
            .update({ subscription_plan: planName })
            .eq("user_id", profile.user_id);
          console.log(`[WEBHOOK] subscription.updated → plan set to ${planName} for user ${profile.user_id}`);
        } else if (status === "past_due" || status === "unpaid") {
          await supabase.from("credit_transactions").insert({
            user_id:     profile.user_id,
            amount:      0,
            type:        "subscription_issue",
            description: `Suscripción en estado "${status}". Se requiere acción de pago.`,
          });
          console.log(`[WEBHOOK] subscription.updated → status ${status} for user ${profile.user_id}`);
        } else if (status === "canceled" || status === "incomplete_expired") {
          await supabase
            .from("profiles")
            .update({ subscription_plan: "Free" })
            .eq("user_id", profile.user_id);
          console.log(`[WEBHOOK] subscription.updated → reset to Free for user ${profile.user_id}`);
        }
      } else {
        console.warn(`[WEBHOOK] subscription.updated: no profile found for customer ${customerId}`);
      }
    }

    // ── customer.subscription.deleted (cancelación) ─────────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId   = typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer as any)?.id ?? "";

      const profile = await findProfileByCustomerId(supabase, stripe, customerId);

      if (profile) {
        await supabase
          .from("profiles")
          .update({ subscription_plan: "Free" })
          .eq("user_id", profile.user_id);
        console.log(`[WEBHOOK] Reset to Free for user ${profile.user_id} (cancellation)`);
      } else {
        console.warn(`[WEBHOOK] subscription.deleted: no profile found for customer ${customerId}`);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WEBHOOK] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

async function addCredits(supabase: any, userId: string, credits: number, description: string) {
  await supabase.from("credit_transactions").insert({
    user_id:     userId,
    amount:      credits,
    type:        "purchase",
    description,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("available_credits")
    .eq("user_id", userId)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ available_credits: profile.available_credits + credits })
      .eq("user_id", userId);
  }

  console.log(`[WEBHOOK] Added ${credits} credits to user ${userId}`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
