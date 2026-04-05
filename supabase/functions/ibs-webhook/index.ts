import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { workCertifiedEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toCheckerNetworkSlug = (network?: string) => {
  const normalized = (network || "polygon").toLowerCase();
  if (normalized === "fantom_opera_mainnet" || normalized === "fantom" || normalized === "opera") {
    return "opera";
  }
  return normalized;
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
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    if (webhookSecret) {
      const expectedPrefix = webhookSecret.substring(0, 4);
      const receivedPrefix = secretParam ? secretParam.substring(0, 4) : "(none)";
      console.log(`[IBS-WEBHOOK-EVIDENCE] Secret check — expected starts: "${expectedPrefix}…", received starts: "${receivedPrefix}…", match: ${secretParam === webhookSecret}`);
      if (secretParam !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[IBS-WEBHOOK-EVIDENCE] IBS_WEBHOOK_SECRET not configured, skipping validation");
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
      const checkerNetwork = toCheckerNetworkSlug(network);
      const signedPdfUrl = event === "evidence.signed_pdf.certified" ? data.signed_pdf_url : undefined;
      const integrityEntry = Array.isArray(data.payload?.integrity) ? data.payload.integrity[0] : null;
      const ibsPayloadChecksum = typeof integrityEntry?.checksum === "string" ? integrityEntry.checksum : null;
      const ibsPayloadAlgorithm = typeof integrityEntry?.algorithm === "string" ? integrityEntry.algorithm : null;

      let checkerUrl: string | undefined;
      if (data.payload?.certification?.links?.checker) {
        checkerUrl = data.payload.certification.links.checker;
      } else if (certHash) {
        checkerUrl = `https://checker.icommunitylabs.com/check/${checkerNetwork}/${certHash}`;
      }

      const { data: work } = await supabaseAdmin
        .from("works")
        .select("id, user_id, status")
        .eq("ibs_evidence_id", evidenceId)
        .single();

      if (work) {
        const updates: Record<string, unknown> = {
          status: "registered",
          blockchain_hash: certHash,
          blockchain_network: network,
          checker_url: checkerUrl,
          certificate_url: signedPdfUrl || checkerUrl,
          certified_at: certTimestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (ibsPayloadChecksum) updates.ibs_payload_checksum = ibsPayloadChecksum;
        if (ibsPayloadAlgorithm) updates.ibs_payload_algorithm = ibsPayloadAlgorithm;

        await supabaseAdmin
          .from("works")
          .update(updates)
          .eq("id", work.id);
        console.log(`[IBS-WEBHOOK-EVIDENCE] Work ${work.id} certified. Hash: ${certHash}`);

        // Send work certified email
        try {
          const { data: workFull } = await supabaseAdmin
            .from("works")
            .select("title")
            .eq("id", work.id)
            .single();
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(work.user_id);
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name, language")
            .eq("user_id", work.user_id)
            .single();
          if (authUser?.email && workFull) {
            const displayName = profile?.display_name || authUser.user_metadata?.display_name || authUser.email.split("@")[0];
            const userLang = profile?.language;
            const email = workCertifiedEmail({
              name: displayName,
              workTitle: workFull.title,
              blockchainHash: certHash || "",
              network: network || "polygon",
              checkerUrl,
              certificateUrl: signedPdfUrl || checkerUrl,
              lang: userLang,
            });
            const messageId = crypto.randomUUID();
            await supabaseAdmin.from("email_send_log").insert({
              message_id: messageId, template_name: "work_certified", recipient_email: authUser.email, status: "pending",
            });
            await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `work-certified-${messageId}`, message_id: messageId,
                to: authUser.email, from: "MusicDibs <noreply@notify.musicdibs.com>",
                sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "work_certified",
                queued_at: new Date().toISOString(),
              },
            });
            console.log(`[IBS-WEBHOOK-EVIDENCE] Work certified email enqueued for ${authUser.email}`);
          }
        } catch (emailErr) {
          console.error("[IBS-WEBHOOK-EVIDENCE] Error enqueuing work certified email:", emailErr);
        }

        // Resolve sync queue entry so cron doesn't retry
        await supabaseAdmin
          .from("ibs_sync_queue")
          .update({ status: "resolved", updated_at: new Date().toISOString() })
          .eq("ibs_evidence_id", evidenceId)
          .in("status", ["waiting", "retrying"]);
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
