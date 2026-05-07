// Admin-only "Test generation" endpoint for /dashboard/admin/ai-models.
// Verifies the resolved provider for a feature_key reachable.
//
// Currently supports a connectivity test for KIE Suno (dispatch + immediate ack).
// For other providers, returns a config summary without actually charging anything.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify admin role
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { settingId, prompt = "test instrumental electronic ambient 60 seconds" } = body || {};
    if (!settingId) return json({ error: "settingId required" }, 400);

    const { data: setting } = await supabaseAdmin
      .from("ai_provider_settings")
      .select("*")
      .eq("id", settingId)
      .maybeSingle();
    if (!setting) return json({ error: "Setting not found" }, 404);

    // Provider connectivity check
    if (setting.provider === "kie_suno") {
      const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
      if (!KIE_API_KEY) return json({ ok: false, error: "KIE_API_KEY not configured" });

      const callBackUrl = `${SUPABASE_URL}/functions/v1/kie-suno-callback?logId=test`;
      const res = await fetch("https://api.kie.ai/api/v1/generate", {
        method: "POST",
        headers: { "Authorization": `Bearer ${KIE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          customMode: true,
          instrumental: setting.feature_key.includes("instrumental"),
          model: setting.model,
          callBackUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return json({
        ok: res.ok,
        provider: "kie_suno",
        model: setting.model,
        status: res.status,
        kieResponse: data,
      });
    }

    if (setting.provider === "elevenlabs") {
      const key = Deno.env.get("ELEVENLABS_API_KEY");
      return json({ ok: !!key, provider: "elevenlabs", model: setting.model, hasKey: !!key });
    }
    if (setting.provider === "lyria" || setting.provider === "gemini") {
      const key = Deno.env.get("GEMINI_API_KEY");
      return json({ ok: !!key, provider: setting.provider, model: setting.model, hasKey: !!key });
    }
    if (setting.provider === "anthropic") {
      const key = Deno.env.get("ANTHROPIC_API_KEY");
      return json({ ok: !!key, provider: "anthropic", model: setting.model, hasKey: !!key });
    }
    if (setting.provider === "fal") {
      const key = Deno.env.get("FAL_API_KEY");
      return json({ ok: !!key, provider: "fal", model: setting.model, hasKey: !!key });
    }
    if (setting.provider === "stability") {
      const key = Deno.env.get("STABILITY_API_KEY");
      return json({ ok: !!key, provider: "stability", model: setting.model, hasKey: !!key });
    }
    if (setting.provider === "runway") {
      const key = Deno.env.get("RUNWAY_API_KEY");
      return json({ ok: !!key, provider: "runway", model: setting.model, hasKey: !!key });
    }
    if (setting.provider === "auphonic") {
      const key = Deno.env.get("AUPHONIC_API_KEY");
      return json({ ok: !!key, provider: "auphonic", model: setting.model, hasKey: !!key });
    }
    if (setting.provider === "roex") {
      const key = Deno.env.get("ROEX_API_KEY");
      return json({ ok: !!key, provider: "roex", model: setting.model, hasKey: !!key });
    }

    return json({ ok: false, provider: setting.provider, message: "Provider not implemented for test" });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
