import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    // Auth client (anon key) to validate the user JWT.
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service role client for fast insert (bypasses RLS).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Validate user via auth client.
    let userId: string;
    try {
      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data?.user?.id) {
        console.error("track-event auth error:", error);
        return json({ error: "unauthorized" }, 401);
      }
      userId = data.user.id;
    } catch (e) {
      console.error("track-event auth exception:", e);
      return json({ error: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body?.event_name || !body?.feature) {
      return json({ error: "event_name and feature are required" }, 400);
    }

    const { event_name, feature, metadata, session_id } = body;

    // Fire-and-forget insert: respond immediately, don't block on DB write.
    const insertPromise = supabase.from("product_events").insert({
      user_id: userId,
      event_name,
      feature,
      metadata: metadata || {},
      session_id: session_id || null,
    });

    // @ts-ignore - EdgeRuntime is available in Supabase Edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        insertPromise.then(({ error }) => {
          if (error) console.error("track-event insert error:", error);
        })
      );
    } else {
      insertPromise.then(({ error }) => {
        if (error) console.error("track-event insert error:", error);
      });
    }

    return json({ ok: true });
  } catch (err) {
    console.error("track-event error:", err);
    return json({ error: "internal error" }, 500);
  }
});
