// Public callback receiver for KIE Suno completion webhooks.
// Hardened phase 1:
// - Validates a per-log `callback_token` (query string) against the stored token.
// - Processes ALL returned tracks, not just the first.
// - Inserts every track into ai_generations with required fields.
// - Refunds on failure.
//
// IMPORTANT: verify_jwt = false (public webhook, no user JWT).

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
    const callbackToken = url.searchParams.get("token");

    const body = await req.json().catch(() => ({}));
    console.log("[kie-suno-callback] received", { logId, code: body?.code });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const code = body?.code;
    const taskId = body?.data?.task_id || body?.data?.taskId;
    const tracks: Array<any> = Array.isArray(body?.data?.data) ? body.data.data : [];

    // Locate log row
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
      return ok({ warning: "no log row" });
    }

    // Authenticate webhook
    if (!logRow.callback_token || logRow.callback_token !== callbackToken) {
      console.warn("[kie-suno-callback] callback_token mismatch", { logId });
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if already completed, ack and return
    if (logRow.status === "completed") return ok({ already: true });

    // Failure path
    if (code !== 200 || tracks.length === 0) {
      await supabase
        .from("ai_generation_logs")
        .update({
          status: "failed",
          error_message: body?.msg || `code=${code}`,
          response_payload: body,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);

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
      return ok({});
    }

    // Process every returned track. All variants share a generation_group_id.
    const BUCKET = "ai-generations";
    const groupId = crypto.randomUUID();
    const savedTracks: Array<{
      url: string;
      duration: number;
      storage_path: string | null;
      variant_index: number;
    }> = [];

    // Only persist the primary variant — KIE Suno returns 2 by default
    // and the user expects a single generation per request.
    const maxVariants = Math.min(tracks.length, 1);
    for (let i = 0; i < maxVariants; i++) {
      const t = tracks[i];
      const sourceUrl: string | undefined = t?.audio_url;
      if (!sourceUrl) continue;
      const duration: number = Math.round(Number(t?.duration) || 0);
      let finalUrl = sourceUrl;
      let storagePath: string | null = null;
      try {
        const audioRes = await fetch(sourceUrl);
        if (audioRes.ok) {
          const arr = new Uint8Array(await audioRes.arrayBuffer());
          const ownerId = logRow.user_id || "system";
          const path = `${ownerId}/kie_${Date.now()}_${i}.mp3`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, arr, { contentType: "audio/mpeg", upsert: false });
          if (!upErr) {
            storagePath = path;
            // Compatibility: still emit a signed URL, but storage_path is the source of truth.
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(path, 60 * 60 * 24 * 365);
            if (signed?.signedUrl) finalUrl = signed.signedUrl;
          } else {
            console.error("[kie-suno-callback] storage upload error:", upErr);
          }
        }
      } catch (e) {
        console.error("[kie-suno-callback] copy-to-storage failed:", e);
      }
      savedTracks.push({ url: finalUrl, duration, storage_path: storagePath, variant_index: i });

      // Insert into ai_generations — one row per variant.
      if (logRow.user_id) {
        await supabase.from("ai_generations").insert({
          user_id: logRow.user_id,
          prompt: String(logRow.request_payload?.prompt || "").slice(0, 2500),
          audio_url: finalUrl,
          duration: duration || 0,
          provider: "kie_suno",
          generation_group_id: groupId,
          variant_index: i,
          is_primary: i === 0,
          provider_task_id: logRow.provider_task_id || taskId || null,
          storage_bucket: storagePath ? BUCKET : null,
          storage_path: storagePath,
        });
      }
    }

    const primary = savedTracks[0];
    await supabase
      .from("ai_generation_logs")
      .update({
        status: "completed",
        response_payload: body,
        output_url: primary?.url ?? null,
        storage_bucket: primary?.storage_path ? BUCKET : null,
        storage_path: primary?.storage_path ?? null,
        structured_outputs: { generation_group_id: groupId, variants: savedTracks },
        completed_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    return ok({ tracks: savedTracks.length, generation_group_id: groupId });
  } catch (err) {
    console.error("[kie-suno-callback] fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(payload: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...payload }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
