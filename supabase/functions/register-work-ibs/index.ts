import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Registers a work as an evidence in iCommunity (iBS) blockchain.
 * 
 * For files ≤20MB: uses inline base64 upload via POST /evidences
 * For files >20MB: uses presigned upload via POST /evidences/uploads + confirm
 * 
 * Body: { workId: string, signatureId: string }
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

    // Authenticate user
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

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { workId, signatureId } = await req.json();

    if (!workId || typeof workId !== "string") {
      return new Response(JSON.stringify({ error: "workId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signatureId || typeof signatureId !== "string") {
      return new Response(JSON.stringify({ error: "signatureId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the work belongs to the user and is in 'processing' state
    const { data: work, error: workError } = await supabaseAdmin
      .from("works")
      .select("id, user_id, title, status, file_path")
      .eq("id", workId)
      .single();

    if (workError || !work) {
      return new Response(JSON.stringify({ error: "Work not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (work.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (work.status !== "processing") {
      return new Response(
        JSON.stringify({ error: "Work is not in processing state", status: work.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("works-files")
      .download(work.file_path);

    if (downloadError || !fileData) {
      console.error("[IBS] File download error:", downloadError);
      return new Response(JSON.stringify({ error: "Could not download work file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileSizeMB = fileBuffer.byteLength / (1024 * 1024);
    const fileName = work.file_path.split("/").pop() || "file";

    const ibsHeaders = {
      "Authorization": `Bearer ${IBS_API_KEY}`,
      "Content-Type": "application/json",
    };

    let evidenceId: string;
    let evidenceLink: string | undefined;

    if (fileSizeMB <= 20) {
      // ── Inline upload (≤20MB) ──────────────────────────────
      console.log(`[IBS] Inline upload for work ${workId} (${fileSizeMB.toFixed(1)}MB)`);

      const fileBase64 = base64Encode(new Uint8Array(fileBuffer));

      const ibsBody = {
        payload: {
          title: work.title,
          files: [{ name: fileName, file: fileBase64 }],
        },
        signatures: [{ id: signatureId }],
      };

      const ibsRes = await fetch(`${IBS_API_URL}/evidences`, {
        method: "POST",
        headers: ibsHeaders,
        body: JSON.stringify(ibsBody),
      });

      if (!ibsRes.ok) {
        const errBody = await ibsRes.text();
        console.error(`[IBS] Evidence creation failed [${ibsRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `iBS error ${ibsRes.status}: ${errBody}`);
        return new Response(
          JSON.stringify({ success: false, error: `iBS registration failed: ${errBody}`, workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ibsResult = await ibsRes.json();
      evidenceId = ibsResult.id;
      evidenceLink = ibsResult.link;
    } else {
      // ── Large file upload (>20MB) ──────────────────────────
      console.log(`[IBS] Large file upload for work ${workId} (${fileSizeMB.toFixed(1)}MB)`);

      // Step 1: Create upload session
      const uploadBody = {
        title: work.title,
        signatures: [{ id: signatureId }],
        files: [{ name: fileName, content_type: fileData.type || "application/octet-stream", size: fileBuffer.byteLength }],
      };

      const uploadRes = await fetch(`${IBS_API_URL}/evidences/uploads`, {
        method: "POST",
        headers: ibsHeaders,
        body: JSON.stringify(uploadBody),
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        console.error(`[IBS] Upload session creation failed [${uploadRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `iBS upload error ${uploadRes.status}: ${errBody}`);
        return new Response(
          JSON.stringify({ success: false, error: `iBS upload session failed: ${errBody}`, workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const uploadSession = await uploadRes.json();
      const fileUploadInfo = uploadSession.files?.[0];

      if (!fileUploadInfo?.upload?.url) {
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, "No upload URL received from iBS");
        return new Response(
          JSON.stringify({ success: false, error: "No upload URL received", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 2: Upload file to presigned URL
      const presignedHeaders: Record<string, string> = {};
      if (fileUploadInfo.upload.headers) {
        Object.assign(presignedHeaders, fileUploadInfo.upload.headers);
      }

      const putRes = await fetch(fileUploadInfo.upload.url, {
        method: fileUploadInfo.upload.method || "PUT",
        headers: presignedHeaders,
        body: new Uint8Array(fileBuffer),
      });

      if (!putRes.ok) {
        const errBody = await putRes.text();
        console.error(`[IBS] Presigned upload failed [${putRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `File upload failed: ${putRes.status}`);
        return new Response(
          JSON.stringify({ success: false, error: "File upload to storage failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 3: Confirm upload
      const completeUrl = uploadSession.complete?.url || `${IBS_API_URL}/evidences/uploads/${uploadSession.id}/complete`;
      const completeRes = await fetch(completeUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
      });

      if (!completeRes.ok) {
        const errBody = await completeRes.text();
        console.error(`[IBS] Upload confirmation failed [${completeRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `Upload confirmation failed: ${completeRes.status}`);
        return new Response(
          JSON.stringify({ success: false, error: "Upload confirmation failed", workId, status: "failed", refunded: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const completeResult = await completeRes.json();
      evidenceId = completeResult.id;
      evidenceLink = completeResult.link;
    }

    // Update work with iBS evidence info — status stays 'processing' until webhook confirms
    await supabaseAdmin
      .from("works")
      .update({
        ibs_evidence_id: evidenceId,
        ibs_signature_id: signatureId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workId);

    console.log(`[IBS] Evidence created for work ${workId}: ${evidenceId}`);

    return new Response(
      JSON.stringify({
        success: true,
        workId,
        evidenceId,
        evidenceLink,
        status: "processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[IBS-REGISTER] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Handles iBS failure: marks work as failed and refunds credit.
 */
async function handleIbsFailure(
  supabaseAdmin: ReturnType<typeof createClient>,
  workId: string,
  userId: string,
  workTitle: string,
  reason: string
) {
  await supabaseAdmin
    .from("works")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", workId);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("available_credits")
    .eq("user_id", userId)
    .single();

  if (profile) {
    await supabaseAdmin
      .from("profiles")
      .update({
        available_credits: profile.available_credits + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: 1,
      type: "refund",
      description: `Reembolso por fallo iBS: ${workTitle} — ${reason}`,
    });
  }

  console.log(`[IBS] FAILURE — Work ${workId} marked as failed, credit refunded. Reason: ${reason}`);
}
