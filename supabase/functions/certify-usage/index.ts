import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Certifies a usage evidence in iBS blockchain.
 * Body: { usage_evidence_id: string }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IBS_API_KEY = Deno.env.get("IBS_API_KEY");
    if (!IBS_API_KEY) throw new Error("IBS_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { usage_evidence_id } = await req.json();
    if (!usage_evidence_id) {
      return new Response(JSON.stringify({ error: "usage_evidence_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: evidence, error: evErr } = await supabase
      .from("purchase_usage_evidences")
      .select("*")
      .eq("id", usage_evidence_id)
      .single();

    if (evErr || !evidence) {
      return new Response(JSON.stringify({ error: "Usage evidence not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (evidence.certification_status === "certified") {
      return new Response(JSON.stringify({ already_certified: true, ibs_transaction_id: evidence.ibs_transaction_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's iBS signature (same logic as certify-purchase)
    const { data: signature } = await supabase
      .from("ibs_signatures")
      .select("ibs_signature_id")
      .eq("user_id", evidence.user_id)
      .in("status", ["active", "success"])
      .limit(1)
      .maybeSingle();

    const signatureId = signature?.ibs_signature_id || Deno.env.get("IBS_COMPANY_SIGNATURE_ID") || "";

    if (!signatureId) {
      console.error(`[CERTIFY-USAGE] No signature found for user ${evidence.user_id}`);
      return new Response(JSON.stringify({ error: "No signature available for certification" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build payload for hashing
    const payload = {
      id: evidence.id,
      user_id: evidence.user_id,
      purchase_evidence_id: evidence.purchase_evidence_id,
      event_type: evidence.event_type,
      event_timestamp: evidence.event_timestamp,
      ip_address: evidence.ip_address,
      user_agent: evidence.user_agent,
      session_id: evidence.session_id,
      metadata_json: evidence.metadata_json,
    };

    const payloadStr = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadStr);
    const hashBuffer = await crypto.subtle.digest("SHA-256", payloadBytes);
    const hashArray = new Uint8Array(hashBuffer);
    let hashHex = "";
    for (const b of hashArray) hashHex += b.toString(16).padStart(2, "0");

    // Base64
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < payloadBytes.length; i += chunkSize) {
      binary += String.fromCharCode(...payloadBytes.subarray(i, i + chunkSize));
    }
    const payloadBase64 = btoa(binary);

    // Build iBS body using the SAME structure as certify-purchase
    const evidenceTitle = `Evidencia de uso - ${evidence.event_type} - ${evidence.id}`;

    const ibsBody = {
      payload: {
        title: evidenceTitle,
        files: [
          {
            name: "usage-evidence.json",
            file: payloadBase64,
          },
        ],
      },
      signatures: [{ id: signatureId }],
    };

    console.log(`[CERTIFY-USAGE] Registering usage evidence ${evidence.id} in iBS via POST /evidences...`);

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
      console.error(`[CERTIFY-USAGE] iBS error: ${ibsRes.status} - ${errText}`);
      await supabase.from("purchase_usage_evidences").update({
        certification_status: "failed",
        evidence_hash: hashHex,
      }).eq("id", usage_evidence_id);

      return new Response(JSON.stringify({ error: "iBS registration failed", detail: errText.slice(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ibsData = await ibsRes.json();
    const ibsTransactionId = ibsData?.id || ibsData?.evidenceId || ibsData?.transactionId || "";

    console.log(`[CERTIFY-USAGE] ✅ Usage evidence certified: ${ibsTransactionId}`);

    await supabase.from("purchase_usage_evidences").update({
      ibs_transaction_id: ibsTransactionId,
      ibs_registered_at: new Date().toISOString(),
      certification_status: "certified",
      evidence_hash: hashHex,
    }).eq("id", usage_evidence_id);

    return new Response(JSON.stringify({
      success: true,
      ibs_transaction_id: ibsTransactionId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[CERTIFY-USAGE] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
