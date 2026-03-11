import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Webhook for successful iCommunity signature/identity events:
 *   - signature.created
 *   - identity.verification.success
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
      if (token !== webhookSecret) {
        console.warn("[IBS-WEBHOOK-SIG-OK] Invalid or missing authorization token");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const event = body.event;
    const data = body.data;

    console.log(`[IBS-WEBHOOK-SIG-OK] Received event: ${event}`, JSON.stringify(data));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event === "signature.created") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "created", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK-SIG-OK] Signature ${signatureId} created`);

    } else if (event === "identity.verification.success") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK-SIG-OK] Identity verification success for ${signatureId}`);

    } else {
      console.log(`[IBS-WEBHOOK-SIG-OK] Ignoring event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[IBS-WEBHOOK-SIG-OK] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
