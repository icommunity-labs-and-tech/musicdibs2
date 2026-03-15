import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    if (webhookSecret) {
      const expectedPrefix = webhookSecret.substring(0, 4);
      const receivedPrefix = secretParam ? secretParam.substring(0, 4) : "(none)";
      console.log(`[IBS-WEBHOOK-SIG-KO] Secret check — expected starts: "${expectedPrefix}…", received starts: "${receivedPrefix}…", match: ${secretParam === webhookSecret}`);
      if (secretParam !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[IBS-WEBHOOK-SIG-KO] IBS_WEBHOOK_SECRET not configured, skipping validation");
    }

    const body = await req.json();
    const event = body.event;
    const data = body.data;

    console.log(`[IBS-WEBHOOK-SIG-KO] Received event: ${event}`, JSON.stringify(data));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event === "signature.failed") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK-SIG-KO] Signature ${signatureId} failed`);

      // Reset kyc_status to unverified
      const { data: sigFailed } = await supabaseAdmin
        .from("ibs_signatures")
        .select("user_id")
        .eq("ibs_signature_id", signatureId)
        .single();
      if (sigFailed?.user_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ kyc_status: "unverified", ibs_signature_id: null, updated_at: new Date().toISOString() })
          .eq("user_id", sigFailed.user_id);
        console.log(`[IBS-WEBHOOK-SIG-KO] KYC reset to unverified for user ${sigFailed.user_id}`);
      }

    } else if (event === "identity.verification.failed") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "verification_failed", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK-SIG-KO] Identity verification failed for ${signatureId}`);

      // Reset kyc_status to unverified
      const { data: sigVerFailed } = await supabaseAdmin
        .from("ibs_signatures")
        .select("user_id")
        .eq("ibs_signature_id", signatureId)
        .single();
      if (sigVerFailed?.user_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ kyc_status: "unverified", ibs_signature_id: null, updated_at: new Date().toISOString() })
          .eq("user_id", sigVerFailed.user_id);
        console.log(`[IBS-WEBHOOK-SIG-KO] KYC reset to unverified for user ${sigVerFailed.user_id}`);
      }

    } else {
      console.log(`[IBS-WEBHOOK-SIG-KO] Ignoring event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[IBS-WEBHOOK-SIG-KO] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
