import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, { priceId: string; credits: number; mode: "subscription" | "payment"; signupFeePriceId?: string }> = {
  annual: {
    priceId: "price_1T8n6CFULeu7PzK6vs7NZyiJ",
    credits: 120,
    mode: "subscription",
  },
  monthly: {
    priceId: "price_1T8n6lFULeu7PzK60TbO76hE",
    credits: 3,
    mode: "subscription",
    signupFeePriceId: "price_1T8n8kFULeu7PzK6lpXwSWkq",
  },
  individual: {
    priceId: "price_1T8n7dFULeu7PzK6ZncugHJB",
    credits: 1,
    mode: "payment",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { planId } = await req.json();
    const plan = PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // For subscriptions, check if user already has an active one
    if (plan.mode === "subscription" && customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length > 0) {
        throw new Error("Ya tienes una suscripción activa. Cancélala antes de contratar otra.");
      }
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: plan.priceId, quantity: 1 },
    ];

    // For monthly plan, check if this is a new customer (needs signup fee)
    if (plan.signupFeePriceId && customerId) {
      // Check if customer has had a subscription before
      const allSubs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
      if (allSubs.data.length === 0) {
        // First time — add signup fee
        lineItems.push({ price: plan.signupFeePriceId, quantity: 1 });
      }
    } else if (plan.signupFeePriceId && !customerId) {
      // New customer — add signup fee
      lineItems.push({ price: plan.signupFeePriceId, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: plan.mode,
      success_url: `${req.headers.get("origin")}/dashboard/credits?payment=success&plan=${planId}`,
      cancel_url: `${req.headers.get("origin")}/dashboard/credits?payment=canceled`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        credits: String(plan.credits),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
