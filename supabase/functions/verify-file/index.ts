import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Verifies a file by searching registered works with:
 *   1) SHA-256 hex hash (internal hash), and fallback
 *   2) SHA-512 base64 checksum (iBS checker integrity checksum).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let fileHash: string | null = null;
    let fileHashSha512Base64: string | null = null;

    const bytesToBase64 = (bytes: Uint8Array) => {
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const buffer = await file.arrayBuffer();

      const sha256Buffer = await crypto.subtle.digest("SHA-256", buffer);
      fileHash = Array.from(new Uint8Array(sha256Buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const sha512Buffer = await crypto.subtle.digest("SHA-512", buffer);
      fileHashSha512Base64 = bytesToBase64(new Uint8Array(sha512Buffer));
    } else {
      // JSON body with pre-computed hashes
      const body = await req.json();
      fileHash = body.fileHash ?? null;
      fileHashSha512Base64 = body.fileHashSha512Base64 ?? null;

      if (!fileHash && !fileHashSha512Base64) {
        return new Response(JSON.stringify({ error: "fileHash or fileHashSha512Base64 is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[VERIFY] Looking up hashes`, { fileHash, fileHashSha512Base64 });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let works: any[] | null = null;
    let error: any = null;

    if (fileHash) {
      const bySha256 = await supabaseAdmin
        .from("works")
        .select("id, title, status, created_at, certified_at, certificate_url, checker_url, blockchain_hash, blockchain_network, ibs_evidence_id, description, type, author")
        .eq("file_hash", fileHash)
        .eq("status", "registered")
        .limit(1);
      works = bySha256.data;
      error = bySha256.error;
    }

    if ((!works || works.length === 0) && !error && fileHashSha512Base64) {
      const byIbsChecksum = await supabaseAdmin
        .from("works")
        .select("id, title, status, created_at, certified_at, certificate_url, checker_url, blockchain_hash, blockchain_network, ibs_evidence_id, description, type, author")
        .eq("ibs_payload_checksum", fileHashSha512Base64)
        .eq("status", "registered")
        .limit(1);
      works = byIbsChecksum.data;
      error = byIbsChecksum.error;
    }

    if (error) {
      console.error("[VERIFY] DB error:", error);
      throw error;
    }

    if (works && works.length > 0) {
      const w = works[0];
      console.log(`[VERIFY] Found work: ${w.id} (${w.title})`);
      return new Response(
        JSON.stringify({
          found: true,
          registrationId: w.id,
          title: w.title,
          registeredAt: w.certified_at || w.created_at,
          certificateUrl: w.certificate_url || w.checker_url,
          blockchainHash: w.blockchain_hash,
          blockchainNetwork: w.blockchain_network,
          ibsEvidenceId: w.ibs_evidence_id,
          description: w.description,
          workType: w.type,
          author: w.author,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[VERIFY] No work found`, { fileHash, fileHashSha512Base64 });
    return new Response(
      JSON.stringify({ found: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[VERIFY] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
