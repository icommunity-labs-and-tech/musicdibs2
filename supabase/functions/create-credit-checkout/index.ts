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
    priceId: "price_1T9TnyF9ZCIiqrz6ruOlBcnZ",
    credits: 120,
    mode: "subscription",
  },
  monthly: {
    priceId: "price_1T9SZvF9ZCIiqrz6TWLtfMBs",
    credits: 3,
    mode: "subscription",
    signupFeePriceId: "price_1T9Sa1F9ZCIiqrz6cGm2fiwn",
  },
  individual: {
    priceId: "price_1T9TnyF9ZCIiqrz6XqgzLo1K",
    credits: 1,
    mode: "payment",
  },
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "annual",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "monthly",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CREDIT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
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
        const currentSub = subs.data[0];
        const currentPriceId = currentSub.items.data[0]?.price?.id;
        const currentPlanId = currentPriceId ? PRICE_TO_PLAN[currentPriceId] : null;

        // If user is trying to subscribe to the same plan, block it
        if (currentPlanId === planId) {
          throw new Error("Ya estás suscrito a este plan.");
        }

        // Otherwise, switch the subscription (upgrade/downgrade) via Stripe API
        logStep("Switching subscription", { from: currentPlanId, to: planId });
        const updatedSub = await stripe.subscriptions.update(currentSub.id, {
          items: [
            {
              id: currentSub.items.data[0].id,
              price: plan.priceId,
            },
          ],
          proration_behavior: "create_prorations",
        });

        // Determine new plan name for profiles table
        const planNameMap: Record<string, string> = { annual: "Annual", monthly: "Monthly" };
        const newPlanName = planNameMap[planId] || planId;

        // Update profiles table
        await supabaseAdmin.from("profiles").update({ subscription_plan: newPlanName }).eq("user_id", user.id);

        // Update credits based on new plan
        const newCredits = plan.credits;
        await supabaseAdmin.from("profiles").update({ available_credits: newCredits }).eq("user_id", user.id);
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: user.id,
          amount: newCredits,
          type: "plan_change",
          description: `Cambio de plan a ${newPlanName}: créditos ajustados a ${newCredits}`,
        });

        logStep("Subscription switched successfully", { subscriptionId: updatedSub.id, newPlan: newPlanName });

        return new Response(JSON.stringify({ 
          switched: true, 
          plan: newPlanName,
          message: `Plan cambiado a ${newPlanName} correctamente.`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Build line items for new checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: plan.priceId, quantity: 1 },
    ];

    // For monthly plan, check if this is a new customer (needs signup fee)
    if (plan.signupFeePriceId && customerId) {
      const allSubs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
      if (allSubs.data.length === 0) {
        lineItems.push({ price: plan.signupFeePriceId, quantity: 1 });
      }
    } else if (plan.signupFeePriceId && !customerId) {
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
