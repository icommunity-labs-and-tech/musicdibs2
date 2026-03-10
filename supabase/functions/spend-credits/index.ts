import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Parse body
    const { amount, feature, description } = await req.json();

    // Validate inputs
    if (!amount || typeof amount !== "number" || amount < 1 || amount > 100) {
      return new Response(JSON.stringify({ error: "Invalid amount (1-100)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!feature || typeof feature !== "string" || feature.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid feature name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for trusted operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check current balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[SPEND-CREDITS] Profile not found:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.available_credits < amount) {
      return new Response(
        JSON.stringify({
          error: "Créditos insuficientes",
          available: profile.available_credits,
          required: amount,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct credits atomically
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        available_credits: profile.available_credits - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("available_credits", profile.available_credits); // Optimistic lock

    if (updateError) {
      console.error("[SPEND-CREDITS] Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to deduct credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the transaction (service role — bypasses RLS)
    const txDescription = description || `Uso: ${feature}`;
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: -amount,
      type: "usage",
      description: txDescription.slice(0, 200),
    });

    const remaining = profile.available_credits - amount;
    console.log(`[SPEND-CREDITS] User ${userId}: -${amount} credits for ${feature}. Remaining: ${remaining}`);

    return new Response(
      JSON.stringify({
        success: true,
        spent: amount,
        remaining,
        feature,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("[SPEND-CREDITS] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
