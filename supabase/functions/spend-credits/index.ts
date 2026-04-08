import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Fallback costs (used only if DB query fails) ───────────
const FALLBACK_COSTS: Record<string, number> = {
  register_work: 1,
  promote_work: 15,
  promote_premium: 30,
  generate_audio: 2,
  generate_audio_song: 3,
  edit_audio: 2,
  enhance_audio: 1,
  generate_cover: 2,
  inspiration: 0,
  generate_video: 6,
  voice_translation_per_min: 2,
  instagram_creative: 1,
  youtube_thumbnail: 1,
  event_poster: 1,
  social_poster: 1,
  social_video: 10,
};

/**
 * spend-credits — VALIDATION ONLY
 *
 * Reads cost from the feature_costs table (with static fallback).
 * Checks if the user has enough credits for the requested feature.
 * Does NOT deduct credits. Each Edge Function handles deduction.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { feature } = await req.json();

    if (!feature || typeof feature !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid feature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Read cost from DB (service role to bypass any RLS edge cases) ──
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let amount: number | null = null;

    const { data: costRow, error: costError } = await supabaseAdmin
      .from("feature_costs")
      .select("credit_cost")
      .eq("feature_key", feature)
      .maybeSingle();

    if (costError) {
      console.warn("[SPEND-CREDITS] DB lookup failed, using fallback:", costError.message);
    }

    if (costRow) {
      amount = costRow.credit_cost;
    } else if (feature in FALLBACK_COSTS) {
      amount = FALLBACK_COSTS[feature];
      console.warn(`[SPEND-CREDITS] Feature "${feature}" not in DB, using fallback: ${amount}`);
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown feature", feature }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Free features
    if (amount === 0) {
      return new Response(
        JSON.stringify({ success: true, spent: 0, remaining: null, feature }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
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
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Validation passed — do NOT deduct. Each Edge Function handles deduction.
    console.log(`[SPEND-CREDITS] Validation OK: user ${user.id}, feature=${feature}, cost=${amount}, balance=${profile.available_credits}`);

    return new Response(
      JSON.stringify({
        success: true,
        spent: 0,
        remaining: profile.available_credits,
        feature,
        cost: amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[SPEND-CREDITS] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
