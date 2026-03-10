import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Simulates IBS (Intellectual Property Blockchain Service) API registration.
 * 
 * In production, this will call the real IBS API.
 * For now, it simulates success/failure based on a `simulate` parameter:
 *   - simulate: "success" (default) → returns a certificate
 *   - simulate: "failure" → returns an error as if IBS rejected the registration
 * 
 * Body: { workId: string, simulate?: "success" | "failure" }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { workId, simulate = "success" } = await req.json();

    if (!workId || typeof workId !== "string") {
      return new Response(JSON.stringify({ error: "workId is required" }), {
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
      .select("id, user_id, title, status")
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

    // ── Simulate IBS API call ────────────────────────────────
    // In production, replace this block with a real HTTP call to IBS API
    console.log(`[IBS-SIMULATE] Work ${workId} — mode: ${simulate}`);

    // Simulate network latency
    await new Promise((r) => setTimeout(r, 1500));

    if (simulate === "failure") {
      // IBS rejected the registration — update work status to 'failed'
      await supabaseAdmin
        .from("works")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", workId);

      // Refund the credit since registration failed
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

        // Log the refund
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId,
          amount: 1,
          type: "refund",
          description: `Reembolso por fallo en registro IBS: ${work.title}`,
        });
      }

      console.log(`[IBS-SIMULATE] FAILURE — Work ${workId} marked as failed, credit refunded`);

      return new Response(
        JSON.stringify({
          success: false,
          error: "IBS registration failed: document hash validation error (simulated)",
          workId,
          status: "failed",
          refunded: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Success path ─────────────────────────────────────────
    // Generate a simulated certificate URL and blockchain hash
    const blockchainHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    const certificateUrl = `https://ibs.example.com/certificates/${workId}?hash=${blockchainHash}`;

    // Update work status to 'registered' with certificate
    await supabaseAdmin
      .from("works")
      .update({
        status: "registered",
        certificate_url: certificateUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workId);

    console.log(`[IBS-SIMULATE] SUCCESS — Work ${workId} registered. Hash: ${blockchainHash}`);

    return new Response(
      JSON.stringify({
        success: true,
        workId,
        status: "registered",
        certificateUrl,
        blockchainHash,
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
