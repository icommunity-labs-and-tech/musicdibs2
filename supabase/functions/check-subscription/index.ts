import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PRICE_TO_PLAN: Record<string, string> = {
  // Annual plans (tiered by credits)
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "Annual",
  "price_1THT7cF9ZCIiqrz6sWS67Q4V": "Annual",  // annual_100
  "price_1THT7gF9ZCIiqrz6Acb2CkDC": "Annual",  // annual_200
  "price_1THT7jF9ZCIiqrz6i02J4bj4": "Annual",  // annual_300
  "price_1THT7nF9ZCIiqrz6r1ZcqH8L": "Annual",  // annual_500
  "price_1THT7rF9ZCIiqrz6UmJDkBNZ": "Annual",  // annual_1000
  // Monthly plan
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "Monthly",
};

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

const toIsoDate = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  if (typeof value === "string") {
    const parsed = value.includes("T") ? new Date(value) : new Date(Number(value) * 1000 || value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toISOString" in value) {
    try {
      return (value as { toISOString: () => string }).toISOString();
    } catch {
      return null;
    }
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Use getClaims for fast local JWT validation (no network call)
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("JWT validation failed, returning graceful response");
      return new Response(JSON.stringify({ subscribed: false, plan: "Free", cancel_at_period_end: false, subscription_end: null, auth_error: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    if (!userEmail) throw new Error("User email not available in token");
    logStep("User authenticated", { userId, email: userEmail });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, setting Free plan");
      await supabaseClient.from("profiles").update({ subscription_plan: "Free" }).eq("user_id", userId);
      return new Response(JSON.stringify({ subscribed: false, plan: "Free", cancel_at_period_end: false, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    await supabaseClient
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId)
      .is("stripe_customer_id", null);

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const subscription = subscriptions.data.find((sub) => ACTIVE_SUB_STATUSES.has(sub.status));

    if (!subscription) {
      logStep("No active-like subscription, setting Free plan");
      await supabaseClient.from("profiles").update({ subscription_plan: "Free" }).eq("user_id", userId);
      return new Response(JSON.stringify({ subscribed: false, plan: "Free", cancel_at_period_end: false, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? (PRICE_TO_PLAN[priceId] || "Monthly") : "Monthly";
    const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;

    // In Clover API, current_period_end moved to subscription items level
    const itemPeriodEnd = (subscription.items.data[0] as any)?.current_period_end;
    const periodEndRaw = itemPeriodEnd ?? (subscription as any).current_period_end ?? (subscription as any).cancel_at ?? (subscription as any).ended_at;
    const subscriptionEnd = toIsoDate(periodEndRaw);

    logStep("Subscription resolved", {
      status: subscription.status,
      plan,
      priceId,
      cancelAtPeriodEnd,
      periodEndRaw,
      subscriptionEnd,
    });

    await supabaseClient
      .from("profiles")
      .update({ subscription_plan: plan })
      .eq("user_id", userId);

    return new Response(JSON.stringify({
      subscribed: true,
      plan,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
