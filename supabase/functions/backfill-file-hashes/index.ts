import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * One-time backfill: compute SHA-256 for all works that have a file_path but no file_hash.
 * Call with POST and admin auth.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get works without file_hash
    const { data: works, error } = await supabaseAdmin
      .from("works")
      .select("id, file_path")
      .is("file_hash", null)
      .not("file_path", "is", null)
      .limit(50);

    if (error) throw error;
    if (!works || works.length === 0) {
      return new Response(JSON.stringify({ message: "No works to backfill", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let failed = 0;

    for (const work of works) {
      try {
        const { data: fileData, error: dlError } = await supabaseAdmin.storage
          .from("works-files")
          .download(work.file_path);

        if (dlError || !fileData) {
          console.warn(`[BACKFILL] Skip ${work.id}: download error`);
          failed++;
          continue;
        }

        const buffer = await fileData.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const fileHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        await supabaseAdmin
          .from("works")
          .update({ file_hash: fileHash })
          .eq("id", work.id);

        updated++;
        console.log(`[BACKFILL] ${work.id} → ${fileHash}`);
      } catch (e) {
        console.warn(`[BACKFILL] Error on ${work.id}:`, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Backfill complete", updated, failed, total: works.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[BACKFILL] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
