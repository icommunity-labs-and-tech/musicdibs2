import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Verifies a file by computing its SHA-256 hash and searching the works table.
 * Accepts multipart/form-data with a "file" field.
 * Does NOT require authentication — anyone can verify.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let fileHash: string;

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
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      fileHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } else {
      // JSON body with pre-computed hash
      const body = await req.json();
      if (!body.fileHash) {
        return new Response(JSON.stringify({ error: "fileHash is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      fileHash = body.fileHash;
    }

    console.log(`[VERIFY] Looking up hash: ${fileHash}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Search by file_hash
    const { data: works, error } = await supabaseAdmin
      .from("works")
      .select("id, title, status, created_at, certified_at, certificate_url, checker_url, blockchain_hash, blockchain_network")
      .eq("file_hash", fileHash)
      .eq("status", "registered")
      .limit(1);

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
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[VERIFY] No work found for hash: ${fileHash}`);
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
