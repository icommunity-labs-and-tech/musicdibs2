import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const DESCRIPTION_TO_FEATURE: Record<string, string> = {
  'Audio AI':                 'generate_audio',
  'Canción con voz':          'generate_audio_song',
  'Generación audio (song)':  'generate_audio_song',
  'Edición AI':               'edit_audio',
  'Pista vocal':              'generate_vocal_track',
  'Auphonic':                 'enhance_audio',
  'Mejora audio':             'enhance_audio',
  'Portada IA':               'generate_cover',
  'Portada':                  'generate_cover',
  'Video AI':                 'generate_video',
  'Promoción RRSS':           'promote_work',
  'Promoción':                'promote_work',
  'Registro':                 'register_work',
  'Nota de prensa':           'generate_press_release',
  'Letras':                   'generate_lyrics',
  'Letra':                    'generate_lyrics',
};

function detectFeature(description: string): string | null {
  if (!description) return null;
  for (const [prefix, featureKey] of Object.entries(DESCRIPTION_TO_FEATURE)) {
    if (description.startsWith(prefix)) return featureKey;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth: cron secret, service role Bearer, or authenticated admin JWT
  const cronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  let isAuthorized =
    (cronSecret && cronSecret === Deno.env.get('CRON_SECRET')) ||
    (authHeader === `Bearer ${serviceKey}`);

  // If not cron/service-role, check if it's an admin user JWT
  if (!isAuthorized && authHeader?.startsWith('Bearer ')) {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claimsErr && claimsData?.claims?.sub) {
      const adminCheck = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey!);
      const { data: roles } = await adminCheck
        .from('user_roles')
        .select('role')
        .eq('user_id', claimsData.claims.sub)
        .eq('role', 'admin')
        .limit(1);
      if (roles && roles.length > 0) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const body = await req.json().catch(() => ({}));
  const targetDate = body.date || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  const { data: configs } = await supabase.from('api_cost_config').select('*');
  if (!configs) {
    return new Response(JSON.stringify({ error: 'Cannot load config' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const configMap = Object.fromEntries(configs.map((c: any) => [c.feature_key, c]));

  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('description, amount')
    .eq('type', 'usage')
    .lt('amount', 0)
    .gte('created_at', `${targetDate}T00:00:00Z`)
    .lt('created_at', `${targetDate}T23:59:59Z`);

  const featureStats: Record<string, { uses: number; credits: number }> = {};
  for (const tx of transactions || []) {
    const fk = detectFeature(tx.description || '');
    if (!fk) continue;
    if (!featureStats[fk]) featureStats[fk] = { uses: 0, credits: 0 };
    featureStats[fk].uses += 1;
    featureStats[fk].credits += Math.abs(tx.amount);
  }

  // Supplement with direct table counts
  const { data: prs } = await supabase
    .from('press_releases')
    .select('id')
    .gte('created_at', `${targetDate}T00:00:00Z`)
    .lt('created_at', `${targetDate}T23:59:59Z`);
  if (prs?.length) featureStats['generate_press_release'] = { uses: prs.length, credits: featureStats['generate_press_release']?.credits || 0 };

  const { data: lyr } = await supabase
    .from('lyrics_generations')
    .select('id')
    .gte('created_at', `${targetDate}T00:00:00Z`)
    .lt('created_at', `${targetDate}T23:59:59Z`);
  if (lyr?.length) featureStats['generate_lyrics'] = { uses: lyr.length, credits: featureStats['generate_lyrics']?.credits || 0 };

  const results = [];
  for (const [featureKey, stats] of Object.entries(featureStats)) {
    const config = configMap[featureKey];
    if (!config) continue;
    const totalRevenue = stats.credits * Number(config.price_per_credit_eur);
    const totalApiCost = stats.uses * Number(config.api_cost_eur);
    const grossMargin = totalRevenue - totalApiCost;
    const marginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    const row = {
      date: targetDate,
      feature_key: featureKey,
      total_uses: stats.uses,
      total_credits_charged: stats.credits,
      total_revenue_eur: Math.round(totalRevenue * 10000) / 10000,
      total_api_cost_eur: Math.round(totalApiCost * 1000000) / 1000000,
      gross_margin_eur: Math.round(grossMargin * 10000) / 10000,
      margin_pct: Math.round(marginPct * 100) / 100,
    };
    await supabase.from('api_cost_daily').upsert(row, { onConflict: 'date,feature_key' });
    results.push(row);
  }

  return new Response(
    JSON.stringify({ success: true, date: targetDate, features: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
