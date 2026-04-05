import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kycInProcessEmail, kycVerifiedEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function enqueueKycEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
  emailData: { subject: string; html: string; text: string },
  label: string,
) {
  const messageId = crypto.randomUUID();
  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: label,
    recipient_email: email,
    status: "pending",
  });
  await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      idempotency_key: `${label}-${messageId}`,
      message_id: messageId,
      to: email,
      from: "MusicDibs <noreply@notify.musicdibs.com>",
      sender_domain: "notify.musicdibs.com",
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      purpose: "transactional",
      label,
      queued_at: new Date().toISOString(),
    },
  });
  console.log(`[IBS-WEBHOOK-SIG-OK] Enqueued ${label} email to ${email}, messageId: ${messageId}`);
}

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

    // Helper to get user info from signature
    async function getUserFromSignature(signatureId: string) {
      const { data: sig } = await supabaseAdmin
        .from("ibs_signatures")
        .select("user_id")
        .eq("ibs_signature_id", signatureId)
        .single();
      if (!sig?.user_id) return null;

      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(sig.user_id);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, language")
        .eq("user_id", sig.user_id)
        .single();

      return {
        userId: sig.user_id,
        email: user?.email,
        name: profile?.display_name || user?.email?.split("@")[0] || "Usuario",
        lang: profile?.language,
      };
    }

    if (event === "signature.created") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "created", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK-SIG-OK] Signature ${signatureId} created`);

      // Mark kyc_status as pending
      const userInfo = await getUserFromSignature(signatureId);
      if (userInfo) {
        await supabaseAdmin
          .from("profiles")
          .update({ kyc_status: "pending", ibs_signature_id: signatureId, updated_at: new Date().toISOString() })
          .eq("user_id", userInfo.userId);
        console.log(`[IBS-WEBHOOK-SIG-OK] KYC set to pending for user ${userInfo.userId}`);

        // Send "in process" email
        if (userInfo.email) {
          const emailData = kycInProcessEmail({ name: userInfo.name });
          await enqueueKycEmail(supabaseAdmin, userInfo.email, emailData, "kyc_in_process");
        }
      }

    } else if (event === "identity.verification.success" || event === "signature.verification.success") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);
      console.log(`[IBS-WEBHOOK-SIG-OK] Verification success (${event}) for ${signatureId}`);

      // Update kyc_status to verified
      const userInfo = await getUserFromSignature(signatureId);
      if (userInfo) {
        await supabaseAdmin
          .from("profiles")
          .update({ kyc_status: "verified", ibs_signature_id: signatureId, updated_at: new Date().toISOString() })
          .eq("user_id", userInfo.userId);
        console.log(`[IBS-WEBHOOK-SIG-OK] KYC verified for user ${userInfo.userId}`);

        // Send verified email
        if (userInfo.email) {
          const emailData = kycVerifiedEmail({ name: userInfo.name, lang: userInfo.lang });
          await enqueueKycEmail(supabaseAdmin, userInfo.email, emailData, "kyc_verified");
        }
      }

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
