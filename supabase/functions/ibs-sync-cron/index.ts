import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Validar que la llamada viene de pg_cron ──────────────
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET") ?? "ibs_cron_secret_2026_musicdibs";

    if (cronSecret !== expectedSecret) {
      console.warn("[IBS-SYNC-CRON] Unauthorized call — invalid x-cron-secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const IBS_API_KEY = Deno.env.get("IBS_API_KEY");
    if (!IBS_API_KEY) throw new Error("IBS_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get stale queue items (>15 min old)
    const { data: items, error } = await supabaseAdmin
      .from("ibs_sync_queue")
      .select("*")
      .in("status", ["waiting", "retrying"])
      .lt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(20);

    if (error) throw error;
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, resolved: 0, retrying: 0, exhausted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary = { processed: items.length, resolved: 0, retrying: 0, exhausted: 0 };

    for (const item of items) {
      try {
        const ibsRes = await fetch(`${IBS_API_URL}/evidences/${item.ibs_evidence_id}`, {
          headers: { Authorization: `ApiKey ${IBS_API_KEY}` },
        });

        if (ibsRes.ok) {
          const evidence = await ibsRes.json();
          const certification = evidence.certification || evidence.payload?.certification;

          if (evidence.status === "certified" && certification) {
            // Resolve — update work to registered
            const checkerUrl =
              certification.links?.checker ||
              (certification.hash && certification.network
                ? `https://checker.icommunitylabs.com/check/${certification.network}/${certification.hash}`
                : undefined);

            await supabaseAdmin
              .from("works")
              .update({
                status: "registered",
                blockchain_hash: certification.hash,
                blockchain_network: certification.network || "polygon",
                checker_url: checkerUrl,
                certificate_url: checkerUrl,
                certified_at: certification.timestamp || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.work_id);

            await supabaseAdmin
              .from("ibs_sync_queue")
              .update({ status: "resolved", updated_at: new Date().toISOString() })
              .eq("id", item.id);

            summary.resolved++;
            console.log(`[IBS-SYNC] Resolved work ${item.work_id} via cron`);
          } else {
            // Not yet certified — retry or exhaust
            await handleRetryOrExhaust(supabaseAdmin, item, summary, "Not yet certified");
          }
        } else {
          // iBS error — retry or exhaust
          const errText = await ibsRes.text().catch(() => "unknown");
          await handleRetryOrExhaust(supabaseAdmin, item, summary, `iBS ${ibsRes.status}: ${errText}`);
        }
      } catch (fetchErr) {
        // Network error — retry or exhaust
        const msg = fetchErr instanceof Error ? fetchErr.message : "network error";
        await handleRetryOrExhaust(supabaseAdmin, item, summary, msg);
      }
    }

    console.log(`[IBS-SYNC] Summary:`, JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[IBS-SYNC] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function handleRetryOrExhaust(
  supabaseAdmin: ReturnType<typeof createClient>,
  item: any,
  summary: { retrying: number; exhausted: number },
  reason: string,
) {
  if (item.retry_count < item.max_retries) {
    await supabaseAdmin
      .from("ibs_sync_queue")
      .update({
        status: "retrying",
        retry_count: item.retry_count + 1,
        last_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    summary.retrying++;
    console.log(`[IBS-SYNC] Retrying ${item.work_id} (${item.retry_count + 1}/${item.max_retries}): ${reason}`);
  } else {
    await supabaseAdmin
      .from("ibs_sync_queue")
      .update({
        status: "exhausted",
        error_detail: `Max retries reached — ${reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    // Mark work as failed and refund credit
    await supabaseAdmin
      .from("works")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", item.work_id);

    // Refund credit
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", item.user_id)
      .single();

    if (profile) {
      await supabaseAdmin
        .from("profiles")
        .update({
          available_credits: profile.available_credits + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", item.user_id);

      await supabaseAdmin.from("credit_transactions").insert({
        user_id: item.user_id,
        amount: 1,
        type: "refund",
        description: `Reembolso automático (sync cron): ${reason}`,
      });
    }

    summary.exhausted++;
    console.log(`[IBS-SYNC] Exhausted ${item.work_id}: ${reason}`);
  }
}
