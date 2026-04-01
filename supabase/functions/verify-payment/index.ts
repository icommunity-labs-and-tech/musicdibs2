import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("Not authenticated");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("[VERIFY-PAYMENT] Session:", JSON.stringify({
      id: session.id,
      status: session.payment_status,
      mode: session.mode,
      metadata: session.metadata,
    }));

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ fulfilled: false, reason: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaUserId = session.metadata?.user_id;
    if (metaUserId !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    const planId = session.metadata?.plan_id || "unknown";
    const CREDITS_MAP: Record<string, number> = {
      annual_100: 100, annual_200: 200, annual_300: 300, annual_500: 500, annual_1000: 1000,
      monthly: 8, individual: 1,
      topup_10: 10, topup_25: 25, topup_50: 50, topup_100: 100, topup_200: 200,
    };
    const credits = CREDITS_MAP[planId] ?? (session.metadata?.credits ? parseInt(session.metadata.credits, 10) : 0);

    if (credits <= 0) {
      return new Response(JSON.stringify({ fulfilled: false, reason: "no_credits" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already fulfilled (idempotency) — look for existing transaction with this session ID
    const { data: existing } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "purchase")
      .ilike("description", `%${session.id}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("[VERIFY-PAYMENT] Already fulfilled:", session.id);
      return new Response(JSON.stringify({ fulfilled: true, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add credits
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", user.id)
      .single();

    const currentCredits = profile?.available_credits ?? 0;

    await supabaseAdmin.from("profiles").update({
      available_credits: currentCredits + credits,
    }).eq("user_id", user.id);

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      amount: credits,
      type: "purchase",
      description: `Compra ${planId}: +${credits} crédito(s) [${session.id}]`,
    });

    // For subscription plans, update the plan name
    const planMap: Record<string, string> = { annual: "Annual", monthly: "Monthly" };
    const planName = planMap[planId];
    if (planName) {
      await supabaseAdmin.from("profiles").update({ subscription_plan: planName }).eq("user_id", user.id);
    }

    console.log(`[VERIFY-PAYMENT] Fulfilled: +${credits} credits for user ${user.id} (session ${session.id})`);

    return new Response(JSON.stringify({ fulfilled: true, credits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[VERIFY-PAYMENT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
