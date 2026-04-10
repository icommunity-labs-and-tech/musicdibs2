import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ACTION_EVENTS_BY_FEATURE: Record<string, string[]> = {
  create_music: ["generation_completed"],
  lyrics: ["lyrics_generated"],
  vocal: ["vocal_track_generated"],
  voice_cloning: ["voice_cloned"],
  cover: ["cover_generated"],
  video: ["video_generated"],
  social_video: ["social_video_generated"],
  promotion: ["promotion_generated"],
  premium_promotion: ["premium_promotion_submitted"],
  press: ["press_release_generated"],
  register: ["work_registered"],
  enhance_audio: ["enhance_audio_completed"],
  distribution: ["distribution_clicked"],
  inspire: ["ai_studio_entered"],
};

const REVENUE_COST_KEYS: Record<string, string[]> = {
  create_music: ["generate_audio", "generate_audio_song"],
  vocal: ["generate_vocal_track"],
  voice_cloning: ["voice_translation_per_min"],
  cover: ["generate_cover"],
  video: ["generate_video"],
  social_video: ["social_video"],
  promotion: ["promote_work"],
  premium_promotion: ["promote_premium"],
  press: ["generate_press_release"],
  register: ["register_work"],
  enhance_audio: ["enhance_audio"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body?.date || getYesterday();
    } catch {
      targetDate = getYesterday();
    }

    const dayStart = `${targetDate}T00:00:00.000Z`;
    const dayEnd = `${targetDate}T23:59:59.999Z`;

    const { data: events, error } = await sb
      .from("product_events")
      .select("event_name, feature, user_id, metadata")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    if (error) throw error;

    const rows = events || [];

    const count = (name: string) => rows.filter((event) => event.event_name === name).length;
    const countFeatureAction = (feature: string) =>
      rows.filter(
        (event) =>
          event.feature === feature &&
          (ACTION_EVENTS_BY_FEATURE[feature] || []).includes(event.event_name)
      ).length;

    const uniqueUsers = new Set(rows.map((event) => event.user_id)).size;

    const { data: costConfig } = await sb
      .from("api_cost_config")
      .select("feature_key, credit_cost, price_per_credit_eur");

    const configMap = new Map((costConfig || []).map((config) => [config.feature_key, config]));
    const revenueByFeature: Record<string, number> = {};

    for (const [featureKey, costKeys] of Object.entries(REVENUE_COST_KEYS)) {
      const uses = countFeatureAction(featureKey);
      const configs = costKeys
        .map((costKey) => configMap.get(costKey))
        .filter(Boolean) as { credit_cost: number; price_per_credit_eur: number }[];

      const creditCost = configs.length > 0
        ? Math.round(configs.reduce((sum, config) => sum + config.credit_cost, 0) / configs.length)
        : 0;
      const pricePerCredit = configs.length > 0
        ? configs.reduce((sum, config) => sum + Number(config.price_per_credit_eur), 0) / configs.length
        : 0;

      revenueByFeature[featureKey] = uses * creditCost * pricePerCredit;
    }

    const totalRevenue = Object.values(revenueByFeature).reduce((sum, value) => sum + value, 0);

    const row = {
      date: targetDate,
      ai_studio_entries: count("ai_studio_entered"),
      generations_started: count("generation_started"),
      generations_completed: count("generation_completed"),
      audios_downloaded: count("audio_downloaded"),
      works_after_generation: count("work_registered_after_generation"),
      uses_create_music: countFeatureAction("create_music"),
      uses_lyrics: countFeatureAction("lyrics"),
      uses_vocal: countFeatureAction("vocal"),
      uses_cover: countFeatureAction("cover"),
      uses_video: countFeatureAction("video"),
      uses_promotion: countFeatureAction("promotion"),
      uses_press: countFeatureAction("press"),
      uses_register: countFeatureAction("register"),
      uses_voice_cloning: countFeatureAction("voice_cloning"),
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
