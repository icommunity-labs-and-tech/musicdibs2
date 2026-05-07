// One-shot admin tool: re-query KIE Suno by task_id and persist the result
// into ai_generations + finalize ai_generation_logs. Used to recover lost songs
// caused by the intermediate-callback bug.
//
// POST { logId: "..." }  (admin only)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth: require admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const logId = body.logId;
    if (!logId) return json({ error: "logId required" }, 400);

    const { data: logRow } = await supabase
      .from("ai_generation_logs").select("*").eq("id", logId).maybeSingle();
    if (!logRow) return json({ error: "log not found" }, 404);
    const taskId = logRow.provider_task_id;
    if (!taskId) return json({ error: "no provider_task_id" }, 400);

    // KIE record-info
    const infoRes = await fetch(`https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_API_KEY}` },
    });
    const infoJson = await infoRes.json();
    console.log("[recover] kie record-info", JSON.stringify(infoJson).slice(0, 500));

    const tracks: any[] = infoJson?.data?.response?.sunoData
      || infoJson?.data?.response?.data
      || infoJson?.data?.sunoData
      || [];
    if (!tracks.length || !tracks[0]?.audioUrl && !tracks[0]?.audio_url) {
      return json({ error: "no tracks ready", info: infoJson }, 422);
    }

    const BUCKET = "ai-generations";
    const groupId = crypto.randomUUID();
    const t = tracks[0];
    const sourceUrl = t.audioUrl || t.audio_url;
    const duration = Math.round(Number(t.duration) || 0);
    let finalUrl = sourceUrl;
    let storagePath: string | null = null;

    try {
      const audioRes = await fetch(sourceUrl);
      if (audioRes.ok) {
        const arr = new Uint8Array(await audioRes.arrayBuffer());
        const path = `${logRow.user_id}/kie_${Date.now()}_recovered.mp3`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET).upload(path, arr, { contentType: "audio/mpeg", upsert: false });
        if (!upErr) {
          storagePath = path;
          const { data: signed } = await supabase.storage
            .from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
          if (signed?.signedUrl) finalUrl = signed.signedUrl;
        }
      }
    } catch (e) {
      console.error("[recover] storage upload failed", e);
    }

    // Insert into ai_generations
    const { error: insErr } = await supabase.from("ai_generations").insert({
      user_id: logRow.user_id,
      prompt: String(logRow.request_payload?.prompt || "").slice(0, 2500),
      audio_url: finalUrl,
      duration: duration || 0,
      provider: "kie_suno",
      generation_group_id: groupId,
      variant_index: 0,
      is_primary: true,
      provider_task_id: taskId,
      storage_bucket: storagePath ? BUCKET : null,
      storage_path: storagePath,
    });
    if (insErr) return json({ error: "insert failed", details: insErr.message }, 500);

    await supabase.from("ai_generation_logs").update({
      output_url: finalUrl,
      storage_bucket: storagePath ? BUCKET : null,
      storage_path: storagePath,
      structured_outputs: { generation_group_id: groupId, recovered: true },
    }).eq("id", logId);

    return json({ ok: true, logId, audio_url: finalUrl, duration });
  } catch (err) {
    console.error("[recover] fatal", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
