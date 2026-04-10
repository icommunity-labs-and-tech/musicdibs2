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

    // Credits are handled exclusively by stripe-webhook (checkout.session.completed).
    // This function only verifies payment status for the frontend redirect flow.
    // DO NOT add credits here — it causes double-counting.

    const planId = session.metadata?.plan_id || "unknown";
    const credits = parseInt(session.metadata?.credits || "0", 10);

    console.log(`[VERIFY-PAYMENT] Verified session ${session.id} for user ${user.id} (plan: ${planId}, credits: ${credits})`);

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
