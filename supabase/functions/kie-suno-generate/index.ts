// KIE Suno music generation — async via callback.
// Hardened phase 1:
// - No `adminTest` accepted from public body (admin tests live in ai-provider-test).
// - Requires KIE Suno to be the *active* provider for the feature.
// - Atomic credit debit (UPDATE...WHERE available_credits >= cost) — aborts if 0 rows.
// - Idempotency: if (user_id, idempotency_key) already exists, returns the existing log.
// - Generates a per-log `callback_token` so kie-suno-callback can authenticate the webhook.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-idempotency-key",
};

const FEATURE_KEY_VOCAL = "music_generation_vocal";
const FEATURE_KEY_INSTR = "music_generation_instrumental";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) return json({ error: "KIE_API_KEY not configured" }, 500);

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
    } = body || {};
    // adminTest is intentionally NOT read from body — admins use ai-provider-test.

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return json({ error: "prompt_required", message: "Prompt is required (min 5 chars)" }, 400);
    }

    const featureKey = instrumental ? FEATURE_KEY_INSTR : FEATURE_KEY_VOCAL;

    // Verify KIE Suno is the ACTIVE provider for this feature (not just enabled)
    const { data: setting } = await supabaseAdmin
      .from("ai_provider_settings")
      .select("provider, model, cost_usd_estimate, is_active, is_enabled")
      .eq("feature_key", featureKey)
      .eq("is_active", true)
      .maybeSingle();

    if (!setting || setting.provider !== "kie_suno" || !setting.is_enabled) {
      return json(
        { error: "provider_not_active", message: "KIE Suno is not the active provider for this feature." },
        409,
      );
    }
    const model = setting.model ?? "V4_5";

    // Idempotency — always required. Generate one if the client didn't provide it.
    const idempotencyKey: string =
      req.headers.get("x-idempotency-key") ||
      (typeof body?.idempotencyKey === "string" && body.idempotencyKey) ||
      crypto.randomUUID();

    {
      const { data: existing } = await supabaseAdmin
        .from("ai_generation_logs")
        .select("id, status, provider_task_id, output_url")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        return json({
          ok: true,
          deduplicated: true,
          idempotencyKey,
          logId: existing.id,
          taskId: existing.provider_task_id,
          status: existing.status,
          output_url: existing.output_url,
        });
      }
    }

    // Resolve credit cost from operation_pricing (single source of truth)
    const operationKey = instrumental ? "instrumental_base" : "song_ai_voice";
    const { data: pricingRow } = await supabaseAdmin
      .from("operation_pricing")
      .select("credits_cost")
      .eq("operation_key", operationKey)
      .eq("is_active", true)
      .maybeSingle();
    const creditsCost = pricingRow?.credits_cost ?? 3;

    // Atomic credit debit via RPC. Returns remaining credits or raises.
    const { error: debitErr } = await supabaseAdmin.rpc("debit_user_credits", {
      p_user_id: user.id,
      p_amount: creditsCost,
      p_description: `Generación audio (KIE ${model}): ${prompt.slice(0, 80)}`,
    });
    if (debitErr) {
      const msg = String(debitErr.message || "");
      if (msg.includes("insufficient_credits")) {
        return json({ error: "insufficient_credits", required: creditsCost }, 402);
      }
      return json({ error: "debit_failed", message: msg }, 500);
    }


    // Generate callback token (random) and create log row
    const callbackToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { data: logInsert, error: logErr } = await supabaseAdmin
      .from("ai_generation_logs")
      .insert({
        user_id: user.id,
        feature_key: featureKey,
        provider: "kie_suno",
        model,
        status: "pending",
        request_payload: { prompt, title, style, instrumental, customMode, negativeTags },
        estimated_cost_usd: setting.cost_usd_estimate ?? null,
        user_credits_charged: creditsCost,
        callback_token: callbackToken,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (logErr || !logInsert) {
      // Refund and abort
      await refund(supabaseAdmin, user.id, creditsCost, "Log row creation failed");
      return json({ error: "log_failed", message: logErr?.message || "Could not create log" }, 500);
    }
    const logId = logInsert.id;

    const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-suno-callback?logId=${logId}&token=${callbackToken}`;
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
      headers: { "Authorization": `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(kiePayload),
    });
    const kieJson = await kieRes.json().catch(() => ({}));

    if (!kieRes.ok || (kieJson?.code && kieJson.code !== 200)) {
      console.error("[kie-suno-generate] KIE error", kieRes.status, kieJson);
      await refund(supabaseAdmin, user.id, creditsCost, "KIE dispatch failed");
      await supabaseAdmin
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: kieJson?.msg || `HTTP ${kieRes.status}`,
          response_payload: kieJson,
        })
        .eq("id", logId);
      return json({ error: "provider_error", message: kieJson?.msg || "KIE request failed" }, 502);
    }

    const taskId: string | undefined = kieJson?.data?.taskId;
    await supabaseAdmin
      .from("ai_generation_logs")
      .update({
        provider_task_id: taskId ?? null,
        status: "processing",
        response_payload: kieJson,
      })
      .eq("id", logId);

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
