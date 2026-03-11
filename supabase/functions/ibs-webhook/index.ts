import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Webhook for iCommunity Evidence events only:
 *   - evidence.certified
 *   - evidence.signed_pdf.certified
 *
 * Auth: iBS sends the webhook secret as ?secret=<value> in the URL
 *       and the Supabase anon key as Authorization: Bearer <anon_key>
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret from query parameter
    const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");
    if (webhookSecret) {
      const url = new URL(req.url);
      const secretParam = url.searchParams.get("secret");
      if (secretParam !== webhookSecret) {
        console.warn("[IBS-WEBHOOK-EVIDENCE] Invalid or missing webhook secret in query param");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const event = body.event;
    const data = body.data;

    console.log(`[IBS-WEBHOOK-EVIDENCE] Received event: ${event}`, JSON.stringify(data));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event === "evidence.certified" || event === "evidence.signed_pdf.certified") {
      const evidenceId = data.evidence_id;
      const certHash = data.certification_hash;
      const certTimestamp = data.certification_timestamp;
      const network = data.network || "polygon";
      const signedPdfUrl = event === "evidence.signed_pdf.certified" ? data.signed_pdf_url : undefined;

      let checkerUrl: string | undefined;
      if (data.payload?.certification?.links?.checker) {
        checkerUrl = data.payload.certification.links.checker;
      } else if (certHash && network) {
        checkerUrl = `https://checker.icommunitylabs.com/check/${network}/${certHash}`;
      }

      const { data: work } = await supabaseAdmin
        .from("works")
        .select("id, user_id, status")
        .eq("ibs_evidence_id", evidenceId)
        .single();

      if (work) {
        await supabaseAdmin
          .from("works")
          .update({
            status: "registered",
            blockchain_hash: certHash,
            blockchain_network: network,
            checker_url: checkerUrl,
            certificate_url: signedPdfUrl || checkerUrl,
            certified_at: certTimestamp || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", work.id);
        console.log(`[IBS-WEBHOOK-EVIDENCE] Work ${work.id} certified. Hash: ${certHash}`);
      } else {
        console.warn(`[IBS-WEBHOOK-EVIDENCE] No work found for evidence ${evidenceId}`);
      }
    } else {
      console.log(`[IBS-WEBHOOK-EVIDENCE] Ignoring non-evidence event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[IBS-WEBHOOK-EVIDENCE] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
