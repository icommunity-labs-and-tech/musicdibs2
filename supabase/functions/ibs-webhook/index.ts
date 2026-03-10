import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Webhook endpoint for iCommunity (iBS) events.
 * Handles:
 *   - evidence.certified: updates work status to 'registered' with blockchain info
 *   - signature.verification.success: updates signature status
 *   - signature.verification.failed: updates signature status
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const event = body.event;
    const data = body.data;

    console.log(`[IBS-WEBHOOK] Received event: ${event}`, JSON.stringify(data));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event === "evidence.certified") {
      const evidenceId = data.evidence_id;
      const certHash = data.certification_hash;
      const certTimestamp = data.certification_timestamp;
      const network = data.network || "polygon";
      const title = data.title;

      // Build checker URL if available
      let checkerUrl: string | undefined;
      if (data.payload?.certification?.links?.checker) {
        checkerUrl = data.payload.certification.links.checker;
      } else if (certHash && network) {
        checkerUrl = `https://checker.icommunitylabs.com/check/${network}/${certHash}`;
      }

      // Find the work by evidence_id
      const { data: work, error: workError } = await supabaseAdmin
        .from("works")
        .select("id, user_id, status")
        .eq("ibs_evidence_id", evidenceId)
        .single();

      if (workError || !work) {
        console.warn(`[IBS-WEBHOOK] No work found for evidence ${evidenceId}`);
        return new Response(JSON.stringify({ received: true, matched: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update work to registered
      await supabaseAdmin
        .from("works")
        .update({
          status: "registered",
          blockchain_hash: certHash,
          blockchain_network: network,
          checker_url: checkerUrl,
          certificate_url: checkerUrl,
          certified_at: certTimestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", work.id);

      console.log(`[IBS-WEBHOOK] Work ${work.id} certified. Hash: ${certHash}`);

    } else if (event === "signature.verification.success") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK] Signature ${signatureId} verified successfully`);

    } else if (event === "signature.verification.failed") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK] Signature ${signatureId} verification failed`);

    } else {
      console.log(`[IBS-WEBHOOK] Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[IBS-WEBHOOK] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
