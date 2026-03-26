import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Server-side cost configuration ─────────────────────────
const FEATURE_COSTS: Record<string, number> = {
  register_work: 1,
  promote_work: 2,
  generate_audio: 2,
  edit_audio: 2,
  enhance_audio: 1,
  generate_cover: 2,
  inspiration: 0,
  generate_video: 6,
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
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Parse body
    const { feature, description } = await req.json();

    // Validate feature
    if (!feature || typeof feature !== "string" || !(feature in FEATURE_COSTS)) {
      return new Response(
        JSON.stringify({
          error: "Invalid feature",
          validFeatures: Object.keys(FEATURE_COSTS),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get cost from server config (ignore any client-sent amount)
    const amount = FEATURE_COSTS[feature];

    // Free features — no credit deduction needed
    if (amount === 0) {
      return new Response(
        JSON.stringify({ success: true, spent: 0, remaining: null, feature }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Log the transaction
    const txDescription = description || `${feature}`;
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
