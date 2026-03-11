import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Webhook endpoint for iCommunity (iBS) events.
 * Validates authorization token and handles:
 *   - Identidad Digital: signature.created, signature.failed, identity.verification.success, identity.verification.failed
 *   - Evidences: evidence.certified, evidence.signed_pdf.certified
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Validate webhook authorization token ──────────────────
    const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
      if (token !== webhookSecret) {
        console.warn("[IBS-WEBHOOK] Invalid or missing authorization token");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const event = body.event;
    const data = body.data;

    console.log(`[IBS-WEBHOOK] Received event: ${event}`, JSON.stringify(data));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Identidad Digital: Creación de firma confirmada ──────
    if (event === "signature.created") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "created", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK] Signature ${signatureId} created`);

    // ── Identidad Digital: Creación de firma fallida ─────────
    } else if (event === "signature.failed") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK] Signature ${signatureId} failed`);

    // ── Identidad Digital: Verificación confirmada ───────────
    } else if (event === "identity.verification.success") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK] Identity verification success for ${signatureId}`);

    // ── Identidad Digital: Verificación fallida ─────────────
    } else if (event === "identity.verification.failed") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "verification_failed", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK] Identity verification failed for ${signatureId}`);

    // ── Evidences: Evidencia simple certificada ──────────────
    } else if (event === "evidence.certified") {
      const evidenceId = data.evidence_id;
      const certHash = data.certification_hash;
      const certTimestamp = data.certification_timestamp;
      const network = data.network || "polygon";

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
            certificate_url: checkerUrl,
            certified_at: certTimestamp || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", work.id);
        console.log(`[IBS-WEBHOOK] Work ${work.id} certified. Hash: ${certHash}`);
      } else {
        console.warn(`[IBS-WEBHOOK] No work found for evidence ${evidenceId}`);
      }

    // ── Evidences: PDF firmado certificado ───────────────────
    } else if (event === "evidence.signed_pdf.certified") {
      const evidenceId = data.evidence_id;
      const certHash = data.certification_hash;
      const certTimestamp = data.certification_timestamp;
      const network = data.network || "polygon";
      const signedPdfUrl = data.signed_pdf_url;

      let checkerUrl: string | undefined;
      if (certHash && network) {
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
        console.log(`[IBS-WEBHOOK] Work ${work.id} signed PDF certified. Hash: ${certHash}`);
      } else {
        console.warn(`[IBS-WEBHOOK] No work found for evidence ${evidenceId}`);
      }

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