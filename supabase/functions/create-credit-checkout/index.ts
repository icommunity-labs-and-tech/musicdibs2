import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TABLA DE PLANES DEFINITIVA
const PLANS: Record<string, { priceId: string; credits: number; mode: "subscription" | "payment"; label: string }> = {
  // Anuales escalonados
  annual_100:  { priceId: "price_1THT7cF9ZCIiqrz6sWS67Q4V", credits: 100,  mode: "subscription", label: "Anual 100 créditos" },
  annual_200:  { priceId: "price_1THT7gF9ZCIiqrz6Acb2CkDC", credits: 200,  mode: "subscription", label: "Anual 200 créditos" },
  annual_300:  { priceId: "price_1THT7jF9ZCIiqrz6i02J4bj4", credits: 300,  mode: "subscription", label: "Anual 300 créditos" },
  annual_500:  { priceId: "price_1THT7nF9ZCIiqrz6r1ZcqH8L", credits: 500,  mode: "subscription", label: "Anual 500 créditos" },
  annual_1000: { priceId: "price_1THT7rF9ZCIiqrz6UmJDkBNZ", credits: 1000, mode: "subscription", label: "Anual 1000 créditos" },
  // Mensual (sin cuota inscripción)
  monthly:     { priceId: "price_1T9SZvF9ZCIiqrz6TWLtfMBs", credits: 8,    mode: "subscription", label: "Mensual 8 créditos" },
  // Pago único individual
  individual:  { priceId: "price_1THULsF9ZCIiqrz64SbA3AK6", credits: 1,    mode: "payment",       label: "Crédito individual" },
  // Top-ups
  topup_10:    { priceId: "price_1THT7xF9ZCIiqrz60FfiGbfv", credits: 10,   mode: "payment",       label: "Top-up 10 créditos" },
  topup_25:    { priceId: "price_1THT80F9ZCIiqrz6H31dYDMG", credits: 25,   mode: "payment",       label: "Top-up 25 créditos" },
  topup_50:    { priceId: "price_1THT83F9ZCIiqrz6BD2wmUaO", credits: 50,   mode: "payment",       label: "Top-up 50 créditos" },
  topup_100:   { priceId: "price_1THT86F9ZCIiqrz6C548DJnT", credits: 100,  mode: "payment",       label: "Top-up 100 créditos" },
  topup_200:   { priceId: "price_1THT8AF9ZCIiqrz626wSH9Rz", credits: 200,  mode: "payment",       label: "Top-up 200 créditos" },
};

const ANNUAL_PLANS = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];

// Derive product_type from planId
function getProductType(planId: string): string {
  if (ANNUAL_PLANS.includes(planId)) return "annual";
  if (planId === "monthly") return "monthly";
  if (planId === "individual") return "single";
  if (planId.startsWith("topup_")) return "topup";
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = await req.json();
    const { planId, action, attribution } = body;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // CANCEL RENEWAL
    if (action === "cancel_renewal") {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (!customers.data.length) throw new Error("No Stripe customer found");
      const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "all", limit: 10 });
      const activeSub = subs.data.find(s => ["active","trialing","past_due","unpaid"].includes(s.status));
      if (!activeSub) throw new Error("No active subscription");
      if (activeSub.cancel_at_period_end) return new Response(JSON.stringify({ message: "La renovación ya está cancelada." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await stripe.subscriptions.update(activeSub.id, { cancel_at_period_end: true });
      return new Response(JSON.stringify({ message: "Renovación cancelada. Tu plan seguirá activo hasta fin de periodo." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const plan = PLANS[planId];
    if (!plan) throw new Error(`Invalid plan: ${planId}`);

    // Block top-ups for users without an active subscription
    const TOPUP_PLANS = ["topup_10", "topup_25", "topup_50", "topup_100", "topup_200"];
    if (TOPUP_PLANS.includes(planId)) {
      const customers2 = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers2.data.length) {
        const subs = await stripe.subscriptions.list({ customer: customers2.data[0].id, status: "all", limit: 10 });
        const activeSub = subs.data.find(s => ["active","trialing","past_due","unpaid"].includes(s.status) && !s.cancel_at_period_end);
        if (!activeSub) throw new Error("Top-ups require an active subscription. Please subscribe first.");
      } else {
        throw new Error("Top-ups require an active subscription. Please subscribe first.");
      }
    }

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } });
      customerId = customer.id;
    }

    // For subscriptions: check if already has one and handle upgrade/downgrade
    if (plan.mode === "subscription") {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
      const activeSub = subs.data.find(s => ["active","trialing","past_due","unpaid"].includes(s.status));

      if (activeSub) {
        const currentPriceId = activeSub.items.data[0]?.price?.id;
        if (currentPriceId === plan.priceId && !activeSub.cancel_at_period_end) {
          return new Response(JSON.stringify({ already_subscribed: true, message: "Ya tienes este plan activo." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Reactivate if cancelled
        if (currentPriceId === plan.priceId && activeSub.cancel_at_period_end) {
          await stripe.subscriptions.update(activeSub.id, { cancel_at_period_end: false });
          return new Response(JSON.stringify({ switched: true, reactivated: true, message: "Plan reactivado correctamente." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Upgrade/downgrade
        await stripe.subscriptions.update(activeSub.id, {
          items: [{ id: activeSub.items.data[0].id, price: plan.priceId }],
          proration_behavior: "always_invoice",
          cancel_at_period_end: false,
        });
        // Update credits in DB
        const creditsToAdd = plan.credits;
        await supabaseAdmin.from("profiles").update({
          subscription_plan: ANNUAL_PLANS.includes(planId) ? "Annual" : "Monthly",
          available_credits: creditsToAdd,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: user.id, amount: creditsToAdd, type: "subscription",
          description: `Cambio de plan: ${plan.label}`,
        });
        return new Response(JSON.stringify({ switched: true, message: `Plan cambiado a ${plan.label}.` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── Build attribution metadata for Stripe session ──
    const attr = attribution || {};
    const attrMetadata: Record<string, string> = {};
    if (attr.utm_source) attrMetadata.utm_source = String(attr.utm_source).slice(0, 500);
    if (attr.utm_medium) attrMetadata.utm_medium = String(attr.utm_medium).slice(0, 500);
    if (attr.utm_campaign) attrMetadata.utm_campaign = String(attr.utm_campaign).slice(0, 500);
    if (attr.utm_content) attrMetadata.utm_content = String(attr.utm_content).slice(0, 500);
    if (attr.utm_term) attrMetadata.utm_term = String(attr.utm_term).slice(0, 500);
    if (attr.coupon_code) attrMetadata.coupon_code = String(attr.coupon_code).slice(0, 500);
    if (attr.referrer_code) attrMetadata.referrer_code = String(attr.referrer_code).slice(0, 500);
    if (attr.referrer) attrMetadata.referrer = String(attr.referrer).slice(0, 500);
    if (attr.landing_path) attrMetadata.landing_path = String(attr.landing_path).slice(0, 500);
    if (attr.attributed_campaign_name) attrMetadata.attributed_campaign_name = String(attr.attributed_campaign_name).slice(0, 500);

    // Create Stripe Checkout session
    const origin = req.headers.get("origin") || "https://musicdibs.com";
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: plan.mode,
      success_url: `${origin}/dashboard/credits?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/credits?payment=cancelled`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        credits: String(plan.credits),
        product_type: getProductType(planId),
        product_code: planId,
        product_label: plan.label,
        billing_interval: plan.mode === "subscription" ? (ANNUAL_PLANS.includes(planId) ? "yearly" : "monthly") : "",
        ...attrMetadata,
      },
      line_items: [{ price: plan.priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        terms_of_service_acceptance: {
          message: "Acepto los [Términos y Condiciones](https://musicdibs.com/terms) y la [Política de Privacidad](https://musicdibs.com/privacy) de MusicDibs.",
        },
      },
    };

    // When customer already exists, allow Stripe to update their name for tax_id_collection
    if (customerId) {
      (sessionParams as any).customer_update = { name: "auto", address: "auto" };
    }

    // For one-time payments, enable invoice creation so Stripe generates a proper invoice with number
    if (plan.mode === "payment") {
      (sessionParams as any).invoice_creation = { enabled: true };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`[CHECKOUT] Created session for ${planId}: ${session.id}`);

    // Save stripe_customer_id in profiles if not set yet
    const resolvedCustomerId = session.customer as string | undefined;
    if (resolvedCustomerId && user.id) {
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: resolvedCustomerId })
        .eq("user_id", user.id)
        .is("stripe_customer_id", null);
    }

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[CHECKOUT] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
