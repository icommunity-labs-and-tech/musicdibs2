import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Tracks a post-purchase usage event.
 * Body: { event_type, metadata?, session_id? }
 * Automatically links to the most recent purchase_evidence for this user.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event_type, metadata, session_id } = body;

    const validEvents = [
      "login_after_purchase",
      "dashboard_access",
      "ai_song_generated",
      "credits_used",
      "asset_created",
      "download_attempt",
      "distribution_started",
      "promotion_created",
    ];

    if (!event_type || !validEvents.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the most recent purchase evidence for this user
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: latestPurchase } = await serviceSupabase
      .from("purchase_evidences")
      .select("id")
      .eq("user_id", user.id)
      .eq("payment_status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestPurchase) {
      // No purchase found — nothing to link to, skip silently
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract IP & UA from request
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { data: inserted, error: insertError } = await serviceSupabase
      .from("purchase_usage_evidences")
      .insert({
        user_id: user.id,
        purchase_evidence_id: latestPurchase.id,
        event_type,
        event_timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: session_id || null,
        metadata_json: metadata || {},
        certification_status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire and forget certification
    const certUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/certify-usage`;
    fetch(certUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ usage_evidence_id: inserted.id }),
    }).catch((e) => console.error("[TRACK-USAGE] certify fire-and-forget error:", e));

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("track-usage error:", err);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
