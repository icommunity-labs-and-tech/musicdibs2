import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { creditPurchaseEmail, paymentFailedEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── MailerLite sync helper ────────────────────────────────────────────────
async function syncMailerLite(event: string, payload: Record<string, unknown>) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mailerlite-webhook-handler`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ event, ...payload }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[ML-SYNC] ${event} failed ${res.status}: ${txt}`);
    } else {
      await res.text();
      console.log(`[ML-SYNC] ✅ ${event}`);
    }
  } catch (e) {
    console.warn(`[ML-SYNC] ${event} error:`, e);
  }
}

function planToMailerLiteType(plan: string | undefined): string {
  if (!plan) return "single";
  const p = plan.toLowerCase();
  if (p.includes("annual") || p.includes("anual")) return "anuales";
  if (p.includes("month") || p.includes("mensual")) return "mensuales";
  return "single";
}

const PRICE_CREDITS: Record<string, number> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": 120,
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": 100,
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": 200,
  "price_1THT7jF9ZCIiqrz6i02J4bj4": 300,
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": 500,
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": 1000,
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": 8,
  "price_1THULsF9ZCIiqrz64SbA3AK6": 1,
  "price_1THT7xF9ZCIiqrz60FfiGbfv": 10,
  "price_1THT80F9ZCIiqrz6H31dYDMG": 25,
  "price_1THT83F9ZCIiqrz6BD2wmUaO": 50,
  "price_1THT86F9ZCIiqrz6C548DJnT": 100,
  "price_1THT8AF9ZCIiqrz626wSH9Rz": 200,
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

const PRICE_TO_PLAN_ID: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "annual_legacy",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "annual_100",
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "annual_200",
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "annual_300",
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "annual_500",
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "annual_1000",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "monthly",
  "price_1THULsF9ZCIiqrz64SbA3AK6": "individual",
  "price_1THT7xF9ZCIiqrz60FfiGbfv": "topup_10",
  "price_1THT80F9ZCIiqrz6H31dYDMG": "topup_25",
  "price_1THT83F9ZCIiqrz6BD2wmUaO": "topup_50",
  "price_1THT86F9ZCIiqrz6C548DJnT": "topup_100",
  "price_1THT8AF9ZCIiqrz626wSH9Rz": "topup_200",
};

const PLAN_ID_TO_PLAN_NAME: Record<string, string> = {
  annual_100: "Annual", annual_200: "Annual", annual_300: "Annual",
  annual_500: "Annual", annual_1000: "Annual", monthly: "Monthly",
};

function getProductType(planId: string): string {
  if (planId.startsWith("annual")) return "annual";
  if (planId === "monthly") return "monthly";
  if (planId === "individual") return "single";
  if (planId.startsWith("topup_")) return "topup";
  return "unknown";
}

async function findProfileByCustomerId(
  supabase: any, stripe: any, customerId: string,
): Promise<{ user_id: string; available_credits: number } | null> {
  const { data: profile } = await supabase
    .from("profiles").select("user_id, available_credits")
    .eq("stripe_customer_id", customerId).single();
  if (profile) return profile;

  console.warn(`[WEBHOOK] No profile for customer ${customerId} — trying email fallback`);
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  if (customer.email) {
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(customer.email);
    if (authUser?.user) {
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", authUser.user.id);
      const { data: p } = await supabase.from("profiles").select("user_id, available_credits").eq("user_id", authUser.user.id).single();
      return p;
    }
  }
  return null;
}

function getInvoiceCustomerId(invoice: any): string {
  return typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
}

function getInvoicePriceId(invoice: any): string | undefined {
  return invoice.lines?.data?.[0]?.price?.id;
}

// For subscription_update invoices, the first line item is the proration credit
// for the OLD plan. We need the NEW plan's price from the subscription itself.
async function getSubscriptionPriceId(stripe: any, subscriptionId: string): Promise<string | undefined> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return sub.items?.data?.[0]?.price?.id;
  } catch (e) {
    console.warn("[WEBHOOK] Failed to retrieve subscription for price:", e);
    return undefined;
  }
}

// ── Create order record in orders table ──
async function createOrderRecord(
  supabase: any,
  params: {
    userId: string;
    stripeCheckoutSessionId?: string;
    stripeInvoiceId?: string;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    stripeSubscriptionId?: string;
    productType: string;
    productCode: string;
    productLabel: string;
    billingInterval: string | null;
    amountGross: number;
    amountNet?: number;
    currency: string;
    isSubscription: boolean;
    isRenewal: boolean;
    couponCode?: string;
    promotionCode?: string;
    metadata?: Record<string, any>;
    paidAt?: string;
  }
) {
  try {
    // Check if this is the first purchase for this user
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.userId);
    const isFirstPurchase = (count || 0) === 0;

    // Extract UTM data from metadata
    const meta = params.metadata || {};

    // Try to match a campaign
    let campaignId: string | null = null;
    let attributedCampaignName: string | null = meta.attributed_campaign_name || null;

    // Try matching by utm_campaign, coupon_code, or attributed_campaign_name
    const matchField = meta.utm_campaign || params.couponCode || attributedCampaignName;
    if (matchField) {
      let q = supabase.from("marketing_campaigns").select("id, name");
      // Try utm_campaign match first
      if (meta.utm_campaign) {
        const { data: camp } = await q.eq("utm_campaign", meta.utm_campaign).limit(1).maybeSingle();
        if (camp) { campaignId = camp.id; attributedCampaignName = camp.name; }
      }
      // Fallback: coupon match
      if (!campaignId && params.couponCode) {
        const { data: camp } = await supabase.from("marketing_campaigns").select("id, name").eq("coupon_code", params.couponCode).limit(1).maybeSingle();
        if (camp) { campaignId = camp.id; attributedCampaignName = camp.name; }
      }
    }

    const orderData = {
      user_id: params.userId,
      stripe_checkout_session_id: params.stripeCheckoutSessionId || null,
      stripe_invoice_id: params.stripeInvoiceId || null,
      stripe_payment_intent_id: params.stripePaymentIntentId || null,
      stripe_charge_id: params.stripeChargeId || null,
      stripe_subscription_id: params.stripeSubscriptionId || null,
      product_type: params.productType,
      product_code: params.productCode,
      product_label: params.productLabel,
      billing_interval: params.billingInterval,
      quantity: 1,
      amount_gross: params.amountGross,
      amount_net: params.amountNet || null,
      currency: params.currency,
      is_subscription: params.isSubscription,
      is_renewal: params.isRenewal,
      is_first_purchase: isFirstPurchase,
      coupon_code: params.couponCode || null,
      promotion_code: params.promotionCode || null,
      campaign_id: campaignId,
      attributed_campaign_name: attributedCampaignName,
      utm_source: meta.utm_source || null,
      utm_medium: meta.utm_medium || null,
      utm_campaign: meta.utm_campaign || null,
      utm_content: meta.utm_content || null,
      utm_term: meta.utm_term || null,
      referrer: meta.referrer || null,
      landing_path: meta.landing_path || null,
      metadata: meta,
      paid_at: params.paidAt || new Date().toISOString(),
    };

    const { data: order, error } = await supabase.from("orders").insert(orderData).select("id").single();
    if (error) {
      console.error("[WEBHOOK] Failed to create order:", error.message);
      return null;
    }

    // Create order_attribution record
    if (order) {
      await supabase.from("order_attribution").insert({
        order_id: order.id,
        campaign_id: campaignId,
        attributed_campaign_name: attributedCampaignName,
        source: meta.utm_source || null,
        medium: meta.utm_medium || null,
        campaign: meta.utm_campaign || null,
        content: meta.utm_content || null,
        coupon_code: params.couponCode || null,
      });
    }

    console.log(`[WEBHOOK] ✅ Order created: ${order?.id} (first_purchase=${isFirstPurchase}, renewal=${params.isRenewal})`);
    return order;
  } catch (err: any) {
    console.error("[WEBHOOK] Error creating order:", err.message);
    return null;
  }
}

// ── Create purchase evidence record ──
async function createPurchaseEvidence(
  supabase: any,
  params: {
    userId: string;
    orderId?: string;
    email?: string;
    displayName?: string;
    productType: string;
    productName?: string;
    amount: number;
    currency: string;
    paymentIntentId?: string;
    chargeId?: string;
    checkoutSessionId?: string;
    paymentStatus?: string;
    ipAddress?: string;
    userAgent?: string;
    browserLanguage?: string;
    sessionId?: string;
    acceptedTerms?: boolean;
    acceptedTermsVersion?: string;
    acceptedTermsTimestamp?: string;
  }
) {
  try {
    const payload = {
      user_id: params.userId,
      email: params.email,
      display_name: params.displayName,
      product_type: params.productType,
      product_name: params.productName,
      amount: params.amount,
      currency: params.currency,
      payment_provider: "stripe",
      payment_intent_id: params.paymentIntentId,
      charge_id: params.chargeId,
      checkout_session_id: params.checkoutSessionId,
      payment_status: params.paymentStatus || "succeeded",
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      browser_language: params.browserLanguage,
      session_id: params.sessionId,
      accepted_terms: params.acceptedTerms,
      accepted_terms_version: params.acceptedTermsVersion,
      accepted_terms_timestamp: params.acceptedTermsTimestamp,
      purchase_timestamp: new Date().toISOString(),
    };

    // Calculate SHA-256 hash of payload
    const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
    const encoded = new TextEncoder().encode(payloadStr);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashHex = new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));

    const { data: evidence, error } = await supabase.from("purchase_evidences").insert({
      user_id: params.userId,
      order_id: params.orderId || null,
      email: params.email,
      display_name: params.displayName,
      product_type: params.productType,
      product_name: params.productName,
      amount: params.amount,
      currency: params.currency,
      payment_provider: "stripe",
      payment_intent_id: params.paymentIntentId,
      charge_id: params.chargeId,
      checkout_session_id: params.checkoutSessionId,
      payment_status: params.paymentStatus || "succeeded",
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      browser_language: params.browserLanguage,
      session_id: params.sessionId,
      accepted_terms: params.acceptedTerms ?? false,
      accepted_terms_version: params.acceptedTermsVersion,
      accepted_terms_timestamp: params.acceptedTermsTimestamp,
      evidence_payload_json: payload,
      evidence_hash: hashHex,
      certification_status: "pending",
    }).select("id").single();

    if (error) {
      console.error("[WEBHOOK] Failed to create purchase evidence:", error.message);
      return null;
    }

    console.log(`[WEBHOOK] ✅ Purchase evidence created: ${evidence?.id}`);

    // Trigger async certification via certify-purchase function
    if (evidence?.id) {
      try {
        const certUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/certify-purchase`;
        fetch(certUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ evidence_id: evidence.id }),
        }).catch(e => console.warn("[WEBHOOK] certify-purchase fire-and-forget error:", e));
      } catch (e) {
        console.warn("[WEBHOOK] Failed to trigger certify-purchase:", e);
      }
    }

    return evidence;
  } catch (err: any) {
    console.error("[WEBHOOK] Error creating purchase evidence:", err.message);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
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

    const event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    console.log(`[WEBHOOK] Received event: ${event.type}`);

    // ── checkout.session.completed ──────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId   = session.metadata?.user_id;
      const credits  = parseInt(session.metadata?.credits || "0", 10);
      const planId   = session.metadata?.plan_id || "unknown";

      if (userId && credits > 0) {
        // ── Idempotency guard: skip if this checkout session was already processed ──
        const { data: existingCheckoutOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (existingCheckoutOrder) {
          console.log(`[WEBHOOK] Duplicate checkout.session.completed for ${session.id} — skipping`);
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Fetch previous plan BEFORE updating (to detect first annual purchase)
        const { data: prevProfile } = await supabase
          .from("profiles").select("subscription_plan").eq("user_id", userId).single();
        const previousPlan = prevProfile?.subscription_plan || "Free";

        await addCredits(supabase, userId, credits, `Compra plan ${planId}: +${credits} créditos`);

        const planName = PLAN_ID_TO_PLAN_NAME[planId];
        if (planName) {
          await supabase.from("profiles").update({ subscription_plan: planName }).eq("user_id", userId);
          console.log(`[WEBHOOK] Updated subscription_plan to ${planName} for user ${userId}`);
        }

        // Save stripe_customer_id
        let resolvedCustomerId: string | undefined;
        if (session.customer) {
          resolvedCustomerId = typeof session.customer === "string" ? session.customer : session.customer.id;
          await supabase.from("profiles").update({ stripe_customer_id: resolvedCustomerId }).eq("user_id", userId);
          console.log(`[WEBHOOK] Saved stripe_customer_id ${resolvedCustomerId} for user ${userId}`);
        }

        // ── Create order record ──
        const sessionMeta = session.metadata || {};
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        const stripeSubId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id || null;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as any)?.id || null;

        // Check for discount/coupon
        let couponCode: string | undefined;
        let promotionCode: string | undefined;
        try {
          if (session.total_details && (session.total_details as any).breakdown?.discounts?.length > 0) {
            const discount = (session.total_details as any).breakdown.discounts[0];
            couponCode = discount?.discount?.coupon?.id;
            promotionCode = discount?.discount?.promotion_code;
          }
        } catch { /* ignore */ }

        const order = await createOrderRecord(supabase, {
          userId,
          stripeCheckoutSessionId: session.id,
          stripeSubscriptionId: stripeSubId,
          stripePaymentIntentId: paymentIntentId,
          productType: sessionMeta.product_type || getProductType(planId),
          productCode: sessionMeta.product_code || planId,
          productLabel: sessionMeta.product_label || planId,
          billingInterval: sessionMeta.billing_interval || null,
          amountGross: amountTotal,
          currency: session.currency || "eur",
          isSubscription: !!stripeSubId,
          isRenewal: false,
          couponCode: couponCode || sessionMeta.coupon_code,
          promotionCode,
          metadata: sessionMeta,
        });

        // ── Create purchase evidence ──
        {
          const { data: { user: evUser } } = await supabase.auth.admin.getUserById(userId);
          const { data: evProfile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
          await createPurchaseEvidence(supabase, {
            userId,
            orderId: order?.id,
            email: evUser?.email,
            displayName: evProfile?.display_name || evUser?.email,
            productType: sessionMeta.product_type || getProductType(planId),
            productName: sessionMeta.product_label || planId,
            amount: amountTotal,
            currency: session.currency || "eur",
            paymentIntentId: paymentIntentId || undefined,
            chargeId: undefined,
            checkoutSessionId: session.id,
            paymentStatus: "succeeded",
            acceptedTerms: sessionMeta.accepted_terms === "true" || sessionMeta.accepted_terms === true,
            acceptedTermsVersion: sessionMeta.accepted_terms_version,
            acceptedTermsTimestamp: sessionMeta.accepted_terms_timestamp,
          });
        }

        // Send purchase confirmation email
        try {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
          if (authUser?.email) {
            const { data: profileData } = await supabase.from("profiles").select("display_name, language").eq("user_id", userId).single();
            const displayName = profileData?.display_name || authUser.user_metadata?.display_name || authUser.email.split("@")[0];
            const userLang = profileData?.language;
            let invoiceUrl: string | undefined;
            if (resolvedCustomerId) {
              try {
                const invoices = await stripe.invoices.list({ customer: resolvedCustomerId, limit: 1 });
                if (invoices.data[0]?.hosted_invoice_url) invoiceUrl = invoices.data[0].hosted_invoice_url;
              } catch (e) { console.warn("[WEBHOOK] Could not fetch invoice URL:", e); }
            }
            const email = creditPurchaseEmail({ name: displayName, planName: planName || planId, credits, invoiceUrl, lang: userLang });
            const messageId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: messageId, template_name: "credit_purchase", recipient_email: authUser.email, status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `credit-purchase-${messageId}`, message_id: messageId,
                to: authUser.email, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "credit_purchase", queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] Purchase confirmation email enqueued for ${authUser.email}`);
          }
        } catch (emailErr) {
          console.error("[WEBHOOK] Error enqueuing purchase email:", emailErr);
        }

        // ── MailerLite sync: purchase (skip for top-ups and individual credits to preserve subscription group) ──
        const isTopUpOrIndividual = planId.startsWith("topup_") || planId === "individual";
        if (!isTopUpOrIndividual) {
          try {
            const { data: { user: mlUser } } = await supabase.auth.admin.getUserById(userId);
            if (mlUser?.email) {
              const { data: mlProfile } = await supabase.from("profiles").select("language").eq("user_id", userId).single();
              const mlCustId = session.customer ? (typeof session.customer === "string" ? session.customer : (session.customer as any).id) : "";
              await syncMailerLite("purchase.completed", {
                email: mlUser.email, locale: mlProfile?.language || "es",
                plan_type: planToMailerLiteType(planName || planId), stripe_customer_id: mlCustId,
              });
            }
          } catch (mlErr) { console.warn("[WEBHOOK] MailerLite purchase sync error:", mlErr); }
        } else {
          console.log(`[WEBHOOK] Skipping MailerLite group sync for ${planId} (top-up/individual — preserving subscription group)`);
        }

        // ── Notify team: first annual subscription (distribution onboarding) ──
        const ANNUAL_IDS = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
        if (ANNUAL_IDS.includes(planId) && previousPlan !== "Annual") {
          try {
            const { data: { user: distUser } } = await supabase.auth.admin.getUserById(userId);
            const distEmail = distUser?.email || "desconocido";
            const { data: distProfile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
            const distName = distProfile?.display_name || distEmail.split("@")[0];

            const distHtml = `<h2>🎵 Nuevo alta en Distribución</h2><p>Un usuario ha contratado su primera suscripción anual y necesita ser dado de alta en la plataforma de distribución.</p><table style="border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px 12px;font-weight:bold;">Usuario:</td><td style="padding:6px 12px;">${distName}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${distEmail}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Plan:</td><td style="padding:6px 12px;">${planId}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Créditos:</td><td style="padding:6px 12px;">${credits}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">User ID:</td><td style="padding:6px 12px;">${userId}</td></tr></table><p>👉 <a href="https://musicdibs.sonosuite.com/">Dar de alta en Sonosuite</a></p>`;
            const distText = `Nuevo alta en Distribución\nUsuario: ${distName}\nEmail: ${distEmail}\nPlan: ${planId}\nCréditos: ${credits}\nUser ID: ${userId}\nDar de alta en: https://musicdibs.sonosuite.com/`;

            const distMsgId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: distMsgId, template_name: "distribution_onboarding", recipient_email: "marketing@musicdibs.com", status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `dist-onboard-${userId}-${planId}`, message_id: distMsgId,
                to: "marketing@musicdibs.com", cc: "info@musicdibs.com",
                from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: "Nuevo alta en Distribución", html: distHtml, text: distText,
                purpose: "transactional", label: "distribution_onboarding", queued_at: new Date().toISOString(),
              },
            });
            console.log(`[WEBHOOK] ✅ Distribution onboarding email enqueued for user ${distEmail}`);

            // User-facing email: distribution access within 72h
            const userMsgId = crypto.randomUUID();
            const lang = distUser?.user_metadata?.language || "es";
            const userName = distName !== distEmail ? distName : "";
            const subjectByLang: Record<string, string> = {
              es: "Tu acceso a distribución está en camino 🎶", en: "Your distribution access is on its way 🎶", pt: "Seu acesso à distribuição está a caminho 🎶",
            };
            const greetingByLang: Record<string, string> = {
              es: userName ? `¡Hola ${userName}!` : "¡Hola!", en: userName ? `Hi ${userName}!` : "Hi!", pt: userName ? `Olá ${userName}!` : "Olá!",
            };
            const bodyByLang: Record<string, string> = {
              es: `<h2>${greetingByLang["es"]}</h2><p>¡Enhorabuena por activar tu suscripción anual! 🎉</p><p>Estamos preparando tu cuenta en nuestra plataforma de distribución para que puedas llevar tu música a todas las tiendas digitales (Spotify, Apple Music, Amazon Music, y muchas más).</p><p><strong>En un plazo máximo de 72 horas</strong> recibirás un correo electrónico con las instrucciones para generar tu contraseña y acceder a la plataforma de distribución.</p><p>El proceso de alta requiere una configuración manual por parte de nuestro equipo para garantizar que todo esté correctamente vinculado a tu cuenta.</p><p>Si tienes alguna pregunta mientras tanto, no dudes en escribirnos a <a href="mailto:info@musicdibs.com">info@musicdibs.com</a>.</p><p>¡Gracias por confiar en MusicDibs!</p><p>— El equipo de MusicDibs</p>`,
              en: `<h2>${greetingByLang["en"]}</h2><p>Congratulations on activating your annual subscription! 🎉</p><p>We are setting up your account on our distribution platform so you can get your music on all major digital stores (Spotify, Apple Music, Amazon Music, and more).</p><p><strong>Within a maximum of 72 hours</strong> you will receive an email with instructions to create your password and access the distribution platform.</p><p>The onboarding process requires manual setup by our team to ensure everything is properly linked to your account.</p><p>If you have any questions in the meantime, feel free to reach out at <a href="mailto:info@musicdibs.com">info@musicdibs.com</a>.</p><p>Thank you for trusting MusicDibs!</p><p>— The MusicDibs Team</p>`,
              pt: `<h2>${greetingByLang["pt"]}</h2><p>Parabéns por ativar sua assinatura anual! 🎉</p><p>Estamos preparando sua conta em nossa plataforma de distribuição para que você possa levar sua música a todas as lojas digitais (Spotify, Apple Music, Amazon Music e muito mais).</p><p><strong>Em um prazo máximo de 72 horas</strong> você receberá um e-mail com as instruções para gerar sua senha e acessar a plataforma de distribuição.</p><p>O processo de integração requer uma configuração manual por parte da nossa equipe para garantir que tudo esteja corretamente vinculado à sua conta.</p><p>Se tiver alguma dúvida, não hesite em nos escrever em <a href="mailto:info@musicdibs.com">info@musicdibs.com</a>.</p><p>Obrigado por confiar na MusicDibs!</p><p>— A equipe MusicDibs</p>`,
            };
            const userHtml = bodyByLang[lang] || bodyByLang["es"];
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                to: distEmail, subject: subjectByLang[lang] || subjectByLang["es"], html: userHtml,
                purpose: "transactional", idempotency_key: `dist-welcome-${userId}-${planId}`, message_id: userMsgId,
              },
            });
            console.log(`[WEBHOOK] ✅ Distribution welcome email enqueued for ${distEmail}`);
          } catch (distErr) {
            console.error("[WEBHOOK] Error enqueuing distribution emails:", distErr);
          }
        }
      }
    }

    // ── invoice.payment_succeeded / invoice_payment.paid (renovaciones) ─
    if (event.type === "invoice.payment_succeeded" || event.type === "invoice_payment.paid") {
      const obj = event.data.object as any;

      let customerId: string;
      let billingReason: string | null = null;
      let priceId: string | undefined;
      let invoiceId: string | undefined;
      let subscriptionId: string | undefined;
      let invoiceAmount = 0;
      let invoiceCurrency = "eur";

      if (event.type === "invoice_payment.paid") {
        const invId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        if (invId) {
          const invoice = await stripe.invoices.retrieve(invId);
          customerId = getInvoiceCustomerId(invoice);
          billingReason = invoice.billing_reason as string | null;
          priceId = getInvoicePriceId(invoice);
          invoiceId = invId;
          subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : (invoice.subscription as any)?.id;
          invoiceAmount = (invoice.amount_paid || 0) / 100;
          invoiceCurrency = invoice.currency || "eur";
        } else {
          console.warn("[WEBHOOK] invoice_payment.paid: no invoice ID found");
          return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const invoice = obj;
        customerId = getInvoiceCustomerId(invoice);
        billingReason = invoice.billing_reason;
        priceId = getInvoicePriceId(invoice);
        invoiceId = invoice.id;
        subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        invoiceAmount = (invoice.amount_paid || 0) / 100;
        invoiceCurrency = invoice.currency || "eur";
      }

      if (billingReason === "subscription_cycle") {
        const profile = await findProfileByCustomerId(supabase, stripe, customerId);

        if (profile) {
          // ── Idempotency guard: skip if this renewal invoice was already processed ──
          if (invoiceId) {
            const { data: existingRenewalOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_invoice_id", invoiceId)
              .eq("is_renewal", true)
              .maybeSingle();

            if (existingRenewalOrder) {
              console.log(`[WEBHOOK] Duplicate renewal for invoice ${invoiceId} — skipping`);
              return new Response(JSON.stringify({ received: true, duplicate: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }

          const credits = priceId ? (PRICE_CREDITS[priceId] || 0) : 0;

          if (credits > 0) {
            await supabase.from("profiles").update({ available_credits: credits }).eq("user_id", profile.user_id);
            await supabase.from("credit_transactions").insert({
              user_id: profile.user_id, amount: credits, type: "renewal",
              description: `Renovación de suscripción: créditos reiniciados a ${credits}`,
            });
            console.log(`[WEBHOOK] Reset credits to ${credits} for user ${profile.user_id} (renewal)`);
          }

          // ── Create renewal order ──
          const resolvedPlanId = priceId ? (PRICE_TO_PLAN_ID[priceId] || "unknown") : "unknown";
          const productType = getProductType(resolvedPlanId);
          const planLabel = PLAN_ID_TO_PLAN_NAME[resolvedPlanId] ? `Renovación ${resolvedPlanId}` : `Renovación ${resolvedPlanId}`;

          const renewalOrder = await createOrderRecord(supabase, {
            userId: profile.user_id,
            stripeInvoiceId: invoiceId,
            stripeSubscriptionId: subscriptionId,
            productType,
            productCode: resolvedPlanId,
            productLabel: planLabel,
            billingInterval: productType === "annual" ? "yearly" : productType === "monthly" ? "monthly" : null,
            amountGross: invoiceAmount,
            currency: invoiceCurrency,
            isSubscription: true,
            isRenewal: true,
            metadata: {},
          });

          // ── Create purchase evidence for renewal ──
          {
            const { data: { user: rnUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            const { data: rnProfile } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
            await createPurchaseEvidence(supabase, {
              userId: profile.user_id,
              orderId: renewalOrder?.id,
              email: rnUser?.email,
              displayName: rnProfile?.display_name,
              productType,
              productName: planLabel,
              amount: invoiceAmount,
              currency: invoiceCurrency,
              paymentStatus: "succeeded",
            });
          }
        } else {
          console.warn(`[WEBHOOK] payment_succeeded: no profile found for customer ${customerId}`);
        }
      }

      // ── Plan change (upgrade/downgrade) → accumulate credits ──
      if (billingReason === "subscription_update") {
        const profile = await findProfileByCustomerId(supabase, stripe, customerId);

        if (profile) {
          // For subscription_update, invoice line items contain proration entries
          // whose price is the OLD plan. Get the NEW plan's price from the subscription.
          let actualPriceId = priceId;
          if (subscriptionId) {
            const subPriceId = await getSubscriptionPriceId(stripe, subscriptionId);
            if (subPriceId) {
              actualPriceId = subPriceId;
              console.log(`[WEBHOOK] subscription_update: resolved NEW plan price ${actualPriceId} from subscription ${subscriptionId}`);
            }
          }

          const credits = actualPriceId ? (PRICE_CREDITS[actualPriceId] || 0) : 0;

          if (credits > 0) {
            await addCredits(supabase, profile.user_id, credits, `Cambio de plan: +${credits} créditos acumulados`);
            console.log(`[WEBHOOK] Plan change: added ${credits} credits to user ${profile.user_id} (accumulated)`);
          } else {
            console.warn(`[WEBHOOK] subscription_update: no credits mapping for price ${actualPriceId}`);
          }

          // Update plan name
          const resolvedPlanId = actualPriceId ? (PRICE_TO_PLAN_ID[actualPriceId] || null) : null;
          const planName = resolvedPlanId ? (PLAN_ID_TO_PLAN_NAME[resolvedPlanId] || null) : null;
          if (planName) {
            await supabase.from("profiles").update({ subscription_plan: planName }).eq("user_id", profile.user_id);
            console.log(`[WEBHOOK] Plan change: updated plan to ${planName} for user ${profile.user_id}`);
            // Sync MailerLite: move to new plan group
            const { data: { user: changeUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            if (changeUser?.email) {
              const { data: mlProfile } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
              await syncMailerLite("purchase.completed", {
                email: changeUser.email,
                locale: mlProfile?.language || "es",
                plan_type: planToMailerLiteType(planName),
                stripe_customer_id: customerId,
              });
            }
          }

          // ── Create order record for plan change ──
          const planId = resolvedPlanId || "unknown";
          const productType = getProductType(planId);
          const changeOrder = await createOrderRecord(supabase, {
            userId: profile.user_id,
            stripeInvoiceId: invoiceId,
            stripeSubscriptionId: subscriptionId,
            productType,
            productCode: planId,
            productLabel: `Cambio a ${planName || planId}`,
            billingInterval: productType === "annual" ? "yearly" : productType === "monthly" ? "monthly" : null,
            amountGross: invoiceAmount,
            currency: invoiceCurrency,
            isSubscription: true,
            isRenewal: false,
            metadata: {},
          });

          // ── Create purchase evidence for plan change ──
          {
            const { data: { user: chUser } } = await supabase.auth.admin.getUserById(profile.user_id);
            const { data: chProfile } = await supabase.from("profiles").select("display_name").eq("user_id", profile.user_id).single();
            await createPurchaseEvidence(supabase, {
              userId: profile.user_id,
              orderId: changeOrder?.id,
              email: chUser?.email,
              displayName: chProfile?.display_name,
              productType,
              productName: `Cambio a ${planName || planId}`,
              amount: invoiceAmount,
              currency: invoiceCurrency,
              paymentStatus: "succeeded",
            });
          }
        } else {
          console.warn(`[WEBHOOK] subscription_update: no profile found for customer ${customerId}`);
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
          nextAttempt = invoice.next_payment_attempt ? new Date((invoice.next_payment_attempt as number) * 1000).toISOString() : null;
        } else {
          console.warn("[WEBHOOK] invoice_payment.failed: no invoice ID found");
          return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const invoice = obj;
        customerId = getInvoiceCustomerId(invoice);
        attemptCount = invoice.attempt_count;
        nextAttempt = invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null;
      }

      const profile = await findProfileByCustomerId(supabase, stripe, customerId);
      if (profile) {
        const description = `Fallo en cobro de suscripción (intento ${attemptCount})${nextAttempt ? `. Próximo reintento: ${nextAttempt}` : ". No hay más reintentos."}`;
        await supabase.from("credit_transactions").insert({ user_id: profile.user_id, amount: 0, type: "payment_failed", description });
        console.log(`[WEBHOOK] Payment failed for user ${profile.user_id} (attempt ${attemptCount})`);

        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const userEmail = customer.email || "";
          const userName = customer.name || userEmail;
          if (userEmail) {
            const { data: profileData } = await supabase.from("profiles").select("language").eq("user_id", profile.user_id).single();
            const email = paymentFailedEmail({ name: userName, description, attemptCount, nextAttempt, lang: profileData?.language });
            const messageId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: messageId, template_name: "payment_failed", recipient_email: userEmail, status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `payment-failed-${messageId}`, message_id: messageId,
                to: userEmail, from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "payment_failed", queued_at: new Date().toISOString(),
              },
            });
            const adminMsgId = crypto.randomUUID();
            await supabase.from("email_send_log").insert({ message_id: adminMsgId, template_name: "payment_failed_admin", recipient_email: "info@musicdibs.com", status: "pending" });
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `payment-failed-admin-${adminMsgId}`, message_id: adminMsgId,
                to: "info@musicdibs.com", from: "MusicDibs <noreply@notify.musicdibs.com>", sender_domain: "notify.musicdibs.com",
                subject: `⚠️ Fallo de pago — ${userEmail}`, html: email.html, text: email.text,
                purpose: "transactional", label: "payment_failed_admin", queued_at: new Date().toISOString(),
              },
            });
          }
        } catch (emailErr) { console.error("[WEBHOOK] Error enqueuing payment failure email:", emailErr); }
      } else {
        console.warn(`[WEBHOOK] payment_failed: no profile found for customer ${customerId}`);
      }
    }

    // ── customer.subscription.updated ──────────────────────────────────
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : (subscription.customer as any)?.id ?? "";
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const status = subscription.status;

      const profile = await findProfileByCustomerId(supabase, stripe, customerId);
      if (profile) {
        const planName = priceId ? (PRICE_PLAN[priceId] || null) : null;
        if (status === "active" && planName) {
          await supabase.from("profiles").update({ subscription_plan: planName }).eq("user_id", profile.user_id);
          console.log(`[WEBHOOK] subscription.updated → plan set to ${planName} for user ${profile.user_id}`);
        } else if (status === "past_due" || status === "unpaid") {
          await supabase.from("credit_transactions").insert({
            user_id: profile.user_id, amount: 0, type: "subscription_issue",
            description: `Suscripción en estado "${status}". Se requiere acción de pago.`,
          });
        } else if (status === "canceled" || status === "incomplete_expired") {
          await supabase.from("profiles").update({ subscription_plan: "Free" }).eq("user_id", profile.user_id);
        }
      }
    }

    // ── customer.subscription.deleted ─────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : (subscription.customer as any)?.id ?? "";
      const profile = await findProfileByCustomerId(supabase, stripe, customerId);

      if (profile) {
        const { data: cancelProfile } = await supabase.from("profiles").select("subscription_plan, language").eq("user_id", profile.user_id).single();
        const oldPlan = cancelProfile?.subscription_plan;
        await supabase.from("profiles").update({ subscription_plan: "Free" }).eq("user_id", profile.user_id);
        console.log(`[WEBHOOK] Reset to Free for user ${profile.user_id} (cancellation)`);

        try {
          const { data: { user: cancelUser } } = await supabase.auth.admin.getUserById(profile.user_id);
          if (cancelUser?.email) {
            await syncMailerLite("subscription.cancelled", {
              email: cancelUser.email, locale: cancelProfile?.language || "es",
              plan_type: planToMailerLiteType(oldPlan), cancellation_reason: "stripe_deleted",
            });
          }
        } catch (mlErr) { console.warn("[WEBHOOK] MailerLite cancellation sync error:", mlErr); }
      }
    }

    // ── checkout.session.expired ─────────────────────────────────────
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userEmail = session.customer_email;
      const userId = session.metadata?.user_id;

      if (userEmail) {
        console.log(`[WEBHOOK] checkout.session.expired → ${userEmail}`);
        let locale = "en";
        if (userId) {
          const { data: prof } = await supabase.from("profiles").select("language").eq("user_id", userId).single();
          if (prof?.language) locale = prof.language;
        }
        const planType = session.metadata?.plan_type || "mensuales";
        try {
          await syncMailerLite("cart.abandoned", {
            email: userEmail, locale, plan_type: planType,
            amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : "0",
            currency: session.currency?.toUpperCase() || "EUR",
          });
        } catch (mlErr) { console.warn("[WEBHOOK] MailerLite cart.abandoned sync error:", mlErr); }
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WEBHOOK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});

async function addCredits(supabase: any, userId: string, credits: number, description: string) {
  await supabase.from("credit_transactions").insert({ user_id: userId, amount: credits, type: "purchase", description });
  const { data: profile } = await supabase.from("profiles").select("available_credits").eq("user_id", userId).single();
  if (profile) {
    await supabase.from("profiles").update({ available_credits: profile.available_credits + credits }).eq("user_id", userId);
  }
  console.log(`[WEBHOOK] Added ${credits} credits to user ${userId}`);
}
