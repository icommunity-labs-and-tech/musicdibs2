// KIE Suno music generation — async via callback.
// Posts to https://api.kie.ai/api/v1/generate, persists task in ai_generation_logs,
// debits credits up-front (refunded by callback if failed).
//
// Auth: requires logged-in user (validates JWT manually like other functions).
// CORS: enabled for browser calls.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { logGeneration } from "../_shared/ai-provider-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATURE_KEY_VOCAL = "music_generation_vocal";
const FEATURE_KEY_INSTR = "music_generation_instrumental";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      return json({ error: "KIE_API_KEY not configured" }, 500);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const {
      prompt,
      title,
      style,
      negativeTags,
      instrumental = false,
      customMode = true,
      // optional admin test mode (no credits, no log linked to user)
      adminTest = false,
    } = body || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return json({ error: "prompt_required", message: "Prompt is required (min 5 chars)" }, 400);
    }

    const featureKey = instrumental ? FEATURE_KEY_INSTR : FEATURE_KEY_VOCAL;

    // Resolve active setting (only for cost estimation/logging metadata)
    const { data: setting } = await supabaseAdmin
      .from("ai_provider_settings")
      .select("model, cost_usd_estimate, user_credits_cost, config_json")
      .eq("feature_key", featureKey)
      .eq("provider", "kie_suno")
      .eq("is_enabled", true)
      .maybeSingle();

    const model = setting?.model ?? "V4_5";

    // Charge credits unless admin test
    let creditsCharged = 0;
    if (!adminTest) {
      const operationKey = instrumental ? "instrumental_base" : "song_ai_voice";
      const { data: pricingRow } = await supabaseAdmin
        .from("operation_pricing")
        .select("credits_cost")
        .eq("operation_key", operationKey)
        .eq("is_active", true)
        .maybeSingle();
      creditsCharged = pricingRow?.credits_cost ?? 3;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("available_credits")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.available_credits < creditsCharged) {
        return json(
          { error: "insufficient_credits", available: profile?.available_credits ?? 0, required: creditsCharged },
          402,
        );
      }

      await supabaseAdmin
        .from("profiles")
        .update({
          available_credits: profile.available_credits - creditsCharged,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("available_credits", profile.available_credits);

      await supabaseAdmin.from("credit_transactions").insert({
        user_id: user.id,
        amount: -creditsCharged,
        type: "usage",
        description: `Generación audio (KIE ${model}): ${prompt.slice(0, 80)}`,
      });
    }

    // Create log row first so we have an id we can pass as callback context
    const logId = await logGeneration(supabaseAdmin, {
      user_id: adminTest ? null : user.id,
      feature_key: featureKey,
      provider: "kie_suno",
      model,
      status: "pending",
      request_payload: { prompt, title, style, instrumental, customMode, negativeTags },
      estimated_cost_usd: setting?.cost_usd_estimate ?? null,
      user_credits_charged: creditsCharged,
    });

    // Build callback URL pointing to our public callback function
    const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-suno-callback?logId=${logId ?? ""}`;

    const kiePayload: Record<string, unknown> = {
      prompt,
      customMode,
      instrumental,
      model,
      callBackUrl,
    };
    if (title) kiePayload.title = title;
    if (style) kiePayload.style = style;
    if (negativeTags) kiePayload.negativeTags = negativeTags;

    console.log("[kie-suno-generate] dispatching task", { feature: featureKey, model, logId });

    const kieRes = await fetch("https://api.kie.ai/api/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kiePayload),
    });

    const kieJson = await kieRes.json().catch(() => ({}));

    if (!kieRes.ok || (kieJson?.code && kieJson.code !== 200)) {
      console.error("[kie-suno-generate] KIE error", kieRes.status, kieJson);
      // Refund credits
      if (!adminTest && creditsCharged > 0) {
        await refund(supabaseAdmin, user.id, creditsCharged, "KIE dispatch failed");
      }
      if (logId) {
        await supabaseAdmin
          .from("ai_generation_logs")
          .update({
            status: "failed",
            error_message: kieJson?.msg || `HTTP ${kieRes.status}`,
            response_payload: kieJson,
          })
          .eq("id", logId);
      }
      return json({ error: "provider_error", message: kieJson?.msg || "KIE request failed" }, 502);
    }

    const taskId: string | undefined = kieJson?.data?.taskId;
    if (logId) {
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({
          provider_task_id: taskId ?? null,
          status: "processing",
          response_payload: kieJson,
        })
        .eq("id", logId);
    }

    return json({
      ok: true,
      logId,
      taskId,
      status: "processing",
      message: "Generation started. Audio will be available shortly.",
    });
  } catch (err) {
    console.error("[kie-suno-generate] fatal", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refund(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string,
) {
  const { data: p } = await supabase
    .from("profiles")
    .select("available_credits")
    .eq("user_id", userId)
    .single();
  if (!p) return;
  await supabase
    .from("profiles")
    .update({
      available_credits: p.available_credits + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type: "refund",
    description: `Reembolso: ${reason}`.slice(0, 200),
  });
}
