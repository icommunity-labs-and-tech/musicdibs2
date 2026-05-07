// Public callback receiver for KIE Suno completion webhooks.
// Downloads the generated audio, uploads it to our `ai-generations` bucket,
// updates the matching ai_generation_logs row and inserts into ai_generations.
//
// IMPORTANT: verify_jwt = false (public webhook, no user JWT). Identification
// is done via the logId query param we attached when dispatching the task.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const logId = url.searchParams.get("logId");

    const body = await req.json().catch(() => ({}));
    console.log("[kie-suno-callback] received", { logId, code: body?.code });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // KIE callback payload shape (per docs):
    // { code: 200, msg, data: { task_id, callbackType, data: [{ id, audio_url, ... }] } }
    const code = body?.code;
    const taskId = body?.data?.task_id || body?.data?.taskId;
    const tracks = body?.data?.data || [];
    const firstAudioUrl: string | undefined = tracks?.[0]?.audio_url;
    const duration: number | undefined = tracks?.[0]?.duration;

    // Locate the log row
    let logRow: any = null;
    if (logId) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("id", logId)
        .maybeSingle();
      logRow = data;
    }
    if (!logRow && taskId) {
      const { data } = await supabase
        .from("ai_generation_logs")
        .select("*")
        .eq("provider_task_id", taskId)
        .maybeSingle();
      logRow = data;
    }

    if (!logRow) {
      console.warn("[kie-suno-callback] no matching log row", { logId, taskId });
      return new Response(JSON.stringify({ ok: true, warning: "no log row" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Failure
    if (code !== 200 || !firstAudioUrl) {
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: body?.msg || `code=${code}`,
          response_payload: body,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);

      // Refund credits if user was charged
      if (logRow.user_id && logRow.user_credits_charged > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("available_credits")
          .eq("user_id", logRow.user_id)
          .single();
        if (p) {
          await supabase
            .from("profiles")
            .update({
              available_credits: p.available_credits + logRow.user_credits_charged,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", logRow.user_id);
          await supabase.from("credit_transactions").insert({
            user_id: logRow.user_id,
            amount: logRow.user_credits_charged,
            type: "refund",
            description: `Reembolso: KIE generation failed`,
          });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success — download audio and persist to our storage
    let savedUrl: string | null = null;
    try {
      const audioRes = await fetch(firstAudioUrl);
      if (audioRes.ok) {
        const arr = new Uint8Array(await audioRes.arrayBuffer());
        const ownerId = logRow.user_id || "system";
        const fileName = `${ownerId}/kie_${Date.now()}.mp3`;
        const { error: upErr } = await supabase.storage
          .from("ai-generations")
          .upload(fileName, arr, { contentType: "audio/mpeg", upsert: false });
        if (!upErr) {
          const { data: signed } = await supabase.storage
            .from("ai-generations")
            .createSignedUrl(fileName, 60 * 60 * 24 * 365);
          savedUrl = signed?.signedUrl || null;
        } else {
          console.error("[kie-suno-callback] storage upload error:", upErr);
        }
      } else {
        console.error("[kie-suno-callback] could not fetch KIE audio", audioRes.status);
      }
    } catch (e) {
      console.error("[kie-suno-callback] copy-to-storage failed:", e);
    }

    // Fall back to the temporary KIE url if our copy failed
    const finalUrl = savedUrl || firstAudioUrl;

    await supabase
      .from("ai_generation_logs")
      .update({
        status: "completed",
        response_payload: body,
        output_url: finalUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    // Mirror in ai_generations so the existing UI can pick it up
    if (logRow.user_id) {
      await supabase.from("ai_generations").insert({
        user_id: logRow.user_id,
        prompt: (logRow.request_payload?.prompt || "").slice(0, 2500),
        audio_url: finalUrl,
        duration: duration ? Math.round(duration) : 0,
        provider: "kie_suno",
      });
    }

    return new Response(JSON.stringify({ ok: true, output_url: finalUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[kie-suno-callback] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
