import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Allow specifying a date, default to yesterday
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body?.date || getYesterday();
    } catch {
      targetDate = getYesterday();
    }

    // Query product_events for the target date
    const dayStart = `${targetDate}T00:00:00.000Z`;
    const dayEnd = `${targetDate}T23:59:59.999Z`;

    const { data: events, error } = await sb
      .from("product_events")
      .select("event_name, feature, user_id, metadata")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    if (error) throw error;

    const rows = events || [];

    const count = (name: string) => rows.filter((e) => e.event_name === name).length;
    const countFeature = (feature: string) => rows.filter((e) => e.feature === feature).length;

    const uniqueUsers = new Set(rows.map((e) => e.user_id)).size;

    // Revenue: look at credit_transactions for the day and map to features via api_cost_config
    const { data: costConfig } = await sb.from("api_cost_config").select("feature_key, credit_cost, price_per_credit_eur");
    const configMap = new Map((costConfig || []).map((c) => [c.feature_key, c]));

    const revenueByFeature: Record<string, number> = {};
    const featureEventMap: Record<string, string> = {
      create_music: "generation_completed",
      cover: "cover_generated",
      video: "video_generated",
      promotion: "promotion_generated",
      register: "work_registered",
    };

    for (const [featureKey, eventName] of Object.entries(featureEventMap)) {
      const uses = rows.filter((e) => e.event_name === eventName).length;
      const config = configMap.get(featureKey);
      if (config) {
        revenueByFeature[featureKey] = uses * config.credit_cost * Number(config.price_per_credit_eur);
      } else {
        revenueByFeature[featureKey] = 0;
      }
    }

    const totalRevenue = Object.values(revenueByFeature).reduce((a, b) => a + b, 0);

    const row = {
      date: targetDate,
      ai_studio_entries: count("ai_studio_entered"),
      generations_started: count("generation_started"),
      generations_completed: count("generation_completed"),
      audios_downloaded: count("audio_downloaded"),
      works_after_generation: count("work_registered_after_generation"),
      uses_create_music: countFeature("create_music"),
      uses_lyrics: countFeature("lyrics"),
      uses_vocal: countFeature("vocal"),
      uses_cover: countFeature("cover"),
      uses_video: countFeature("video"),
      uses_promotion: countFeature("promotion"),
      uses_press: countFeature("press"),
      uses_register: countFeature("register"),
      uses_voice_cloning: countFeature("voice_cloning"),
      unique_users: uniqueUsers,
      total_revenue_eur: totalRevenue,
      revenue_create_music_eur: revenueByFeature.create_music || 0,
      revenue_cover_eur: revenueByFeature.cover || 0,
      revenue_video_eur: revenueByFeature.video || 0,
      revenue_promotion_eur: revenueByFeature.promotion || 0,
      revenue_register_eur: revenueByFeature.register || 0,
    };

    const { error: upsertError } = await sb
      .from("product_metrics_daily")
      .upsert(row, { onConflict: "date" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ ok: true, date: targetDate, row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
