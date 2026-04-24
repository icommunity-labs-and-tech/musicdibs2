import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kycVerifiedEmail, kycFailedEmail } from "../_shared/transactional-email.ts";
import { validateIbsWebhookAuth } from "../_shared/ibs-webhook-auth.ts";

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
  console.log(`[IBS-WEBHOOK-SIG] Enqueued ${label} to ${email}, messageId: ${messageId}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!validateIbsWebhookAuth(req, "IBS-WEBHOOK-SIG")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body.event;
    const data = body.data;

    console.log(`[IBS-WEBHOOK-SIG] Received event: ${event}`, JSON.stringify(data));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    // signature.created: iBS confirma que la firma fue creada.
    // El usuario AÚN NO ha subido documentos. NO cambiar kyc_status. NO enviar email.
    // El email "en proceso" se envía desde el frontend al redirigir a kyc_url.
    if (event === "signature.created") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "created", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);

      const userInfo = await getUserFromSignature(signatureId);
      if (userInfo) {
        await supabaseAdmin
          .from("profiles")
          .update({ ibs_signature_id: signatureId, updated_at: new Date().toISOString() })
          .eq("user_id", userInfo.userId);
        console.log(`[IBS-WEBHOOK-SIG] Signature created for user ${userInfo.userId}. kyc_status unchanged.`);
      }

    // signature.verification.success / identity.verification.success: KYC aprobado.
    } else if (event === "identity.verification.success" || event === "signature.verification.success") {
      const signatureId = data.signature_id;
      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);

      const userInfo = await getUserFromSignature(signatureId);
      if (userInfo) {
        await supabaseAdmin
          .from("profiles")
          .update({ kyc_status: "verified", ibs_signature_id: signatureId, updated_at: new Date().toISOString() })
          .eq("user_id", userInfo.userId);
        console.log(`[IBS-WEBHOOK-SIG] KYC verified for user ${userInfo.userId}`);

        if (userInfo.email) {
          const emailData = kycVerifiedEmail({ name: userInfo.name, lang: userInfo.lang });
          await enqueueKycEmail(supabaseAdmin, userInfo.email, emailData, "kyc_verified");
        }
      }

    // signature.verification.failed: KYC rechazado.
    // El usuario puede reintentar via PUT /v2/signatures/{id} (solo desde estado failed).
    } else if (event === "signature.verification.failed") {
      const signatureId = data.signature_id;
      const description = data.description || {};
      const errorType = description.type || "";
      const errorComment = description.comment || "";
      const reason = errorComment
        ? `${errorType}: ${errorComment}`.trim()
        : errorType || "Verificación no superada";

      await supabaseAdmin
        .from("ibs_signatures")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("ibs_signature_id", signatureId);

      const userInfo = await getUserFromSignature(signatureId);
      if (userInfo) {
        await supabaseAdmin
          .from("profiles")
          .update({ kyc_status: "failed", updated_at: new Date().toISOString() })
          .eq("user_id", userInfo.userId);
        console.log(`[IBS-WEBHOOK-SIG] KYC failed for user ${userInfo.userId}. Reason: ${reason}`);

        if (userInfo.email) {
          const emailData = kycFailedEmail({ name: userInfo.name, reason, lang: userInfo.lang });
          await enqueueKycEmail(supabaseAdmin, userInfo.email, emailData, "kyc_failed");
        }
      }

    } else {
      console.log(`[IBS-WEBHOOK-SIG] Ignoring unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[IBS-WEBHOOK-SIG] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
