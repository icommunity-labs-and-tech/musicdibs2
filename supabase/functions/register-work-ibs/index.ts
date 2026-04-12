import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const IBS_API_URL = "https://api.icommunitylabs.com/v2";

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Registers a work as an evidence in iCommunity (iBS) blockchain.
 * Uses EdgeRuntime.waitUntil to offload heavy file processing to background,
 * returning immediately to avoid CPU time limits.
 *
 * Body: { workId: string, signatureId: string, additionalFilePaths?: string[] }
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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { workId, signatureId, additionalFilePaths } = await req.json();

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
      .select("id, user_id, title, description, status, file_path, file_hash")
      .eq("id", workId)
      .single();

    if (workError || !work) {
      return new Response(JSON.stringify({ error: "Work not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (work.user_id !== userId) {
      const { data: managedWork } = await supabaseAdmin
        .from("managed_works")
        .select("id")
        .eq("work_id", workId)
        .eq("manager_user_id", userId)
        .maybeSingle();

      if (!managedWork) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (work.status !== "processing") {
      return new Response(
        JSON.stringify({ error: "Work is not in processing state", status: work.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Return immediately, process in background ──────────────
    // @ts-ignore EdgeRuntime is available in Supabase edge runtime
    EdgeRuntime.waitUntil(
      processIbsRegistration(
        supabaseAdmin,
        IBS_API_KEY,
        work,
        userId,
        signatureId,
        Array.isArray(additionalFilePaths) ? additionalFilePaths : []
      )
    );

    return new Response(
      JSON.stringify({
        success: true,
        workId,
        status: "processing",
        message: "Registration queued for background processing",
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
 * Background processing: downloads files, computes hashes, uploads to iBS.
 */
async function processIbsRegistration(
  supabaseAdmin: ReturnType<typeof createClient>,
  IBS_API_KEY: string,
  work: { id: string; user_id: string; title: string; description: string | null; file_path: string; file_hash: string | null },
  userId: string,
  signatureId: string,
  extraPaths: string[]
) {
  const workId = work.id;

  try {
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("works-files")
      .download(work.file_path);

    if (downloadError || !fileData) {
      console.error("[IBS] File download error:", downloadError);
      await handleIbsFailure(supabaseAdmin, workId, userId, work.title, "Could not download work file");
      return;
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileSizeMB = fileBuffer.byteLength / (1024 * 1024);

    const rawFileName = work.file_path.split("/").pop() || "file";
    const fileName = rawFileName.replace(/^\d+_/, "");

    // Use pre-computed SHA-256 hash from client if available
    let fileHash: string;
    if (work.file_hash) {
      fileHash = work.file_hash;
      console.log(`[IBS] Using pre-computed SHA-256 for work ${workId}: ${fileHash}`);
    } else {
      const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
      fileHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      console.log(`[IBS] Computed SHA-256 for work ${workId}: ${fileHash}`);
    }

    // Compute SHA-512 base64 checksum
    const sha512Buffer = await crypto.subtle.digest("SHA-512", fileBuffer);
    const ibsPayloadChecksum = bytesToBase64(new Uint8Array(sha512Buffer));
    const ibsPayloadAlgorithm = "SHA-512";
    console.log(`[IBS] Computed ${ibsPayloadAlgorithm} checksum for work ${workId}`);

    const ibsHeaders = {
      "Authorization": `Bearer ${IBS_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Encode primary file
    const fileBase64 = base64Encode(new Uint8Array(fileBuffer));
    const ibsFiles = [{ name: fileName, file: fileBase64 }];

    // Download and encode additional files
    for (const extraPath of extraPaths) {
      const { data: extraData, error: extraErr } = await supabaseAdmin.storage
        .from("works-files")
        .download(extraPath);
      if (extraErr || !extraData) {
        console.warn(`[IBS] Could not download additional file ${extraPath}:`, extraErr);
        continue;
      }
      const extraBuffer = await extraData.arrayBuffer();
      const extraBase64 = base64Encode(new Uint8Array(extraBuffer));
      const extraName = extraPath.split("/").pop()?.replace(/^\d+_/, "") || "file";
      ibsFiles.push({ name: extraName, file: extraBase64 });
    }

    let evidenceId: string;
    let evidenceLink: string | undefined;

    if (fileSizeMB <= 20) {
      // ── Inline upload (≤20MB) ──────────────────────────────
      console.log(`[IBS] Inline upload for work ${workId} (${fileSizeMB.toFixed(1)}MB), ${ibsFiles.length} file(s)`);

      const ibsPayload: Record<string, unknown> = {
        title: work.title,
        files: ibsFiles,
      };
      if (work.description) {
        ibsPayload.description = work.description;
      }

      const ibsBody = {
        payload: ibsPayload,
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
        return;
      }

      const ibsResult = await ibsRes.json();
      evidenceId = ibsResult.id;
      evidenceLink = ibsResult.link;
    } else {
      // ── Large file upload (>20MB) ──────────────────────────
      console.log(`[IBS] Large file upload for work ${workId} (${fileSizeMB.toFixed(1)}MB)`);

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
        return;
      }

      const uploadSession = await uploadRes.json();
      const fileUploadInfo = uploadSession.files?.[0];

      if (!fileUploadInfo?.upload?.url) {
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, "No upload URL received from iBS");
        return;
      }

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
        return;
      }

      const completeUrl = uploadSession.complete?.url || `${IBS_API_URL}/evidences/uploads/${uploadSession.id}/complete`;
      const completeRes = await fetch(completeUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${IBS_API_KEY}` },
      });

      if (!completeRes.ok) {
        const errBody = await completeRes.text();
        console.error(`[IBS] Upload confirmation failed [${completeRes.status}]:`, errBody);
        await handleIbsFailure(supabaseAdmin, workId, userId, work.title, `Upload confirmation failed: ${completeRes.status}`);
        return;
      }

      const completeResult = await completeRes.json();
      evidenceId = completeResult.id;
      evidenceLink = completeResult.link;
    }

    // Update work with iBS evidence info and checksums
    await supabaseAdmin
      .from("works")
      .update({
        ibs_evidence_id: evidenceId,
        ibs_signature_id: signatureId,
        file_hash: fileHash,
        ibs_payload_checksum: ibsPayloadChecksum,
        ibs_payload_algorithm: ibsPayloadAlgorithm,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workId);

    // Enqueue for resilience
    await supabaseAdmin.from("ibs_sync_queue").insert({
      work_id: workId,
      user_id: userId,
      ibs_evidence_id: evidenceId,
      status: "waiting",
    });

    console.log(`[IBS] Evidence created for work ${workId}: ${evidenceId}`);
  } catch (e) {
    console.error(`[IBS-REGISTER] Background error for work ${workId}:`, e);
    await handleIbsFailure(
      supabaseAdmin,
      workId,
      userId,
      work.title,
      e instanceof Error ? e.message : "Unknown background error"
    );
  }
}

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
