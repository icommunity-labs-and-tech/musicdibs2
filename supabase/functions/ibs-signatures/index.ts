import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kycInProcessEmail } from "../_shared/transactional-email.ts";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

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
 * Manages iCommunity signatures (identities) for users.
 * 
 * Actions:
 *   - create: Creates a new signature via KYC process → returns KYC URL
 *   - create_source: Creates a signature from identity sources
 *   - list: Lists user's signatures (from local DB)
 *   - get: Gets signature details from iBS API
 *   - sync: Syncs signature status from iBS API to local DB
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

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const ibsHeaders = {
      "Authorization": `Bearer ${IBS_API_KEY}`,
      "Content-Type": "application/json",
    };

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── CREATE via KYC ───────────────────────────────────────
    if (action === "create") {
      const { signatureName } = body;
      if (!signatureName) {
        return new Response(JSON.stringify({ error: "signatureName is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/signatures`, {
        method: "POST",
        headers: ibsHeaders,
        body: JSON.stringify({ signature_name: signatureName }),
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await ibsRes.json();

      // Save to local DB
      await supabaseAdmin.from("ibs_signatures").insert({
        user_id: user.id,
        ibs_signature_id: result.signature_id,
        signature_name: signatureName,
        status: "pending",
        kyc_url: result.url,
      });

      // Update profiles.kyc_status to pending (service_role bypasses RLS)
      await supabaseAdmin
        .from("profiles")
        .update({ kyc_status: "pending", ibs_signature_id: result.signature_id, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      console.log(`[IBS-SIGNATURES] KYC set to pending for user ${user.id}`);

      // Send "en proceso" email
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, language")
          .eq("user_id", user.id)
          .single();
        const userName = profile?.display_name || user.email?.split("@")[0] || "Usuario";
        const emailData = kycInProcessEmail({ name: userName, lang: profile?.language });
        const messageId = crypto.randomUUID();
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "kyc_in_process",
          recipient_email: user.email!,
          status: "pending",
        });
        await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            idempotency_key: `kyc-in-process-${messageId}`,
            message_id: messageId,
            to: user.email,
            from: "MusicDibs <noreply@notify.musicdibs.com>",
            sender_domain: "notify.musicdibs.com",
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            purpose: "transactional",
            label: "kyc_in_process",
            queued_at: new Date().toISOString(),
          },
        });
        console.log(`[IBS-SIGNATURES] Enqueued kyc_in_process email for ${user.email}`);
      } catch (emailErr) {
        console.warn("[IBS-SIGNATURES] Failed to send KYC in-process email:", emailErr);
      }

      return new Response(JSON.stringify({
        signatureId: result.signature_id,
        kycUrl: result.url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE from identity sources ─────────────────────────
    if (action === "create_source") {
      const { signatureName, sources } = body;
      if (!signatureName || !sources?.length) {
        return new Response(JSON.stringify({ error: "signatureName and sources are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/signatures/identity`, {
        method: "POST",
        headers: ibsHeaders,
        body: JSON.stringify({ signature_name: signatureName, sources }),
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await ibsRes.json();

      await supabaseAdmin.from("ibs_signatures").insert({
        user_id: user.id,
        ibs_signature_id: result.signature_id,
        signature_name: signatureName,
        status: "success",
      });

      return new Response(JSON.stringify({
        signatureId: result.signature_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST (from local DB) ─────────────────────────────────
    if (action === "list") {
      const { data: sigs, error } = await supabaseUser
        .from("ibs_signatures")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ signatures: sigs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET (from iBS API) ───────────────────────────────────
    if (action === "get") {
      const { ibsSignatureId } = body;
      if (!ibsSignatureId) {
        return new Response(JSON.stringify({ error: "ibsSignatureId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/signatures/${ibsSignatureId}`, {
        headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await ibsRes.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SYNC (update local status from iBS) ──────────────────
    if (action === "sync") {
      const { data: sigs } = await supabaseUser
        .from("ibs_signatures")
        .select("ibs_signature_id, status")
        .eq("user_id", user.id)
        .in("status", ["pending"]);

      if (sigs && sigs.length > 0) {
        for (const sig of sigs) {
          try {
            const ibsRes = await fetch(`${IBS_API_URL}/signatures/${sig.ibs_signature_id}`, {
              headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
            });
            if (ibsRes.ok) {
              const ibsData = await ibsRes.json();
              if (ibsData.status && ibsData.status !== sig.status) {
                await supabaseAdmin
                  .from("ibs_signatures")
                  .update({ status: ibsData.status, updated_at: new Date().toISOString() })
                  .eq("ibs_signature_id", sig.ibs_signature_id);
              }
            }
          } catch (err) {
            console.warn(`[IBS-SIG] Failed to sync ${sig.ibs_signature_id}:`, err);
          }
        }
      }

      return new Response(JSON.stringify({ synced: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POLL evidence status ─────────────────────────────────
    if (action === "poll_evidence") {
      const { evidenceId } = body;
      if (!evidenceId) {
        return new Response(JSON.stringify({ error: "evidenceId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ibsRes = await fetch(`${IBS_API_URL}/evidences/${evidenceId}`, {
        headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        return new Response(JSON.stringify({ error: `iBS error: ${errBody}` }), {
          status: ibsRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const evidence = await ibsRes.json();

      // If certified, update our work record
      if (evidence.status === "certified" || evidence.certification?.hash) {
        const certHash = evidence.certification?.hash;
        const network = evidence.certification?.network || "polygon";
        const checkerNetwork = toCheckerNetworkSlug(network);
        const checkerUrl = evidence.certification?.links?.checker ||
          (certHash ? `https://checker.icommunitylabs.com/check/${checkerNetwork}/${certHash}` : null);
        const integrityEntry = Array.isArray(evidence.payload?.integrity) ? evidence.payload.integrity[0] : null;
        const ibsPayloadChecksum = typeof integrityEntry?.checksum === "string" ? integrityEntry.checksum : null;
        const ibsPayloadAlgorithm = typeof integrityEntry?.algorithm === "string" ? integrityEntry.algorithm : null;

        const { data: work } = await supabaseAdmin
          .from("works")
          .select("id, status")
          .eq("ibs_evidence_id", evidenceId)
          .single();

        if (work && work.status === "processing") {
          const updates: Record<string, unknown> = {
            status: "registered",
            blockchain_hash: certHash,
            blockchain_network: network,
            checker_url: checkerUrl,
            certificate_url: checkerUrl,
            certified_at: evidence.certification?.timestamp || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (ibsPayloadChecksum) updates.ibs_payload_checksum = ibsPayloadChecksum;
          if (ibsPayloadAlgorithm) updates.ibs_payload_algorithm = ibsPayloadAlgorithm;

          await supabaseAdmin
            .from("works")
            .update(updates)
            .eq("id", work.id);
        }
      }

      return new Response(JSON.stringify({
        evidenceId: evidence.id,
        status: evidence.status,
        certification: evidence.certification || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[IBS-SIGNATURES] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
