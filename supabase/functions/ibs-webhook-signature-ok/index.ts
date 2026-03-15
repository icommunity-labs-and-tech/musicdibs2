import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    if (webhookSecret) {
      const expectedPrefix = webhookSecret.substring(0, 4);
      const receivedPrefix = secretParam ? secretParam.substring(0, 4) : "(none)";
      console.log(`[IBS-WEBHOOK-SIG-OK] Secret check — expected starts: "${expectedPrefix}…", received starts: "${receivedPrefix}…", match: ${secretParam === webhookSecret}`);
      if (secretParam !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[IBS-WEBHOOK-SIG-OK] IBS_WEBHOOK_SECRET not configured, skipping validation");
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

    } else if (event === "identity.verification.success" || event === "signature.verification.success") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK-SIG-OK] Verification success (${event}) for ${signatureId}`);

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
