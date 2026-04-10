import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Certifies a purchase evidence in iBS blockchain.
 * Called internally (service_role) after a purchase evidence is created.
 * Body: { evidence_id: string }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IBS_API_KEY = Deno.env.get("IBS_API_KEY");
    if (!IBS_API_KEY) {
      throw new Error("IBS_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { evidence_id } = await req.json();
    if (!evidence_id) {
      return new Response(JSON.stringify({ error: "evidence_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch evidence
    const { data: evidence, error: evError } = await supabase
      .from("purchase_evidences")
      .select("*")
      .eq("id", evidence_id)
      .single();

    if (evError || !evidence) {
      return new Response(JSON.stringify({ error: "Evidence not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (evidence.certification_status === "certified") {
      return new Response(JSON.stringify({ already_certified: true, ibs_transaction_id: evidence.ibs_transaction_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's iBS signature
    const { data: signature } = await supabase
      .from("ibs_signatures")
      .select("ibs_signature_id")
      .eq("user_id", evidence.user_id)
      .in("status", ["active", "success"])
      .limit(1)
      .maybeSingle();

    const signatureId = signature?.ibs_signature_id || Deno.env.get("IBS_COMPANY_SIGNATURE_ID") || "";

    if (!signatureId) {
      console.error(`[CERTIFY-PURCHASE] No signature found for user ${evidence.user_id}`);
      return new Response(JSON.stringify({ error: "No signature available for certification" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the JSON payload and compute hashes
    const payloadStr = JSON.stringify(evidence.evidence_payload_json);
    const payloadBytes = new TextEncoder().encode(payloadStr);

    // SHA-256 for our DB record
    const hashBuffer = await crypto.subtle.digest("SHA-256", payloadBytes);
    const hashArray = new Uint8Array(hashBuffer);
    let hashHex = "";
    for (const b of hashArray) hashHex += b.toString(16).padStart(2, "0");

    // Convert payload JSON to base64 for iBS file upload
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < payloadBytes.length; i += chunkSize) {
      binary += String.fromCharCode(...payloadBytes.subarray(i, i + chunkSize));
    }
    const payloadBase64 = btoa(binary);

    // Build iBS body using the SAME structure as register-work-ibs
    const evidenceTitle = `Comprobante de compra - ${evidence.product_name || evidence.product_type} - ${evidence.id}`;

    const ibsBody = {
      payload: {
        title: evidenceTitle,
        files: [
          {
            name: "purchase-evidence.json",
            file: payloadBase64,
          },
        ],
      },
      signatures: [{ id: signatureId }],
    };

    console.log(`[CERTIFY-PURCHASE] Registering evidence ${evidence.id} in iBS via POST /evidences...`);

    const ibsRes = await fetch(`${IBS_API_URL}/evidences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${IBS_API_KEY}`,
      },
      body: JSON.stringify(ibsBody),
    });

    if (!ibsRes.ok) {
      const errText = await ibsRes.text();
      console.error(`[CERTIFY-PURCHASE] iBS error: ${ibsRes.status} - ${errText}`);
      await supabase.from("purchase_evidences").update({
        certification_status: "failed",
        error_message: `iBS error ${ibsRes.status}: ${errText.slice(0, 500)}`,
        updated_at: new Date().toISOString(),
      }).eq("id", evidence_id);

      return new Response(JSON.stringify({ error: "iBS registration failed", detail: errText.slice(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ibsData = await ibsRes.json();
    const ibsTransactionId = ibsData?.id || ibsData?.evidenceId || ibsData?.transactionId || "";
    const checkerUrl = `https://checker.icommunitylabs.com/check/opera/${ibsTransactionId}`;

    console.log(`[CERTIFY-PURCHASE] ✅ Evidence certified: ${ibsTransactionId}`);

    await supabase.from("purchase_evidences").update({
      ibs_transaction_id: ibsTransactionId,
      ibs_registered_at: new Date().toISOString(),
      certification_status: "certified",
      evidence_hash: hashHex,
      certificate_pdf_url: checkerUrl,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("id", evidence_id);

    return new Response(JSON.stringify({
      success: true,
      ibs_transaction_id: ibsTransactionId,
      checker_url: checkerUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[CERTIFY-PURCHASE] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
