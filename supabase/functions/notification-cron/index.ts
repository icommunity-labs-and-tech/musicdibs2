import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const ML_GROUPS = {
  renovacion_pronto:  { ES: '184095856285189275', EN: '184095859414139935', BR: '184095862266267414' },
  renovacion_urgente: { ES: '184095864692672359', EN: '184095866985908063', BR: '184095869515072664' },
  pocos_creditos:     { ES: '184095872067306902', EN: '184095874480080208', BR: '184095876806870885' },
  creditos_criticos:  { ES: '184095880643609952', EN: '184095883445404882', BR: '184095886230422547' },
  sin_creditos:       { ES: '184095888770073830', EN: '184095891299239754', BR: '184095895331013822' },
  single_recompra:    { ES: '184095898858424250', EN: '184095901652878676', BR: '184095904732547024' },
  aniversario:        { ES: '184095907676947790', EN: '184095907676947790', BR: '184095907676947790' },
};

const PLAN_CREDITS: Record<string, number> = {
  annual_100: 100, annual_200: 200, annual_300: 300,
  annual_500: 500, annual_1000: 1000, monthly: 8,
};

const PRICE_TO_PLAN: Record<string, string> = {
  'price_1THT7cF9ZCIiqrz6sWS67Q4V': 'annual_100',
  'price_1THT7gF9ZCIiqrz6Acb2CkDC': 'annual_200',
  'price_1THT7jF9ZCIiqrz6i02J4bj4': 'annual_300',
  'price_1THT7nF9ZCIiqrz6r1ZcqH8L': 'annual_500',
  'price_1THT7rF9ZCIiqrz6UmJDkBNZ': 'annual_1000',
  'price_1T9SZvF9ZCIiqrz6TWLtfMBs': 'monthly',
};

function log(msg: string, data?: any) { console.log(`[NOTIF-CRON] ${msg}`, data ? JSON.stringify(data) : ''); }

async function mlAddToGroup(email: string, groupId: string, mlKey: string) {
  const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${mlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, groups: [groupId] }),
  });
  if (!res.ok) log(`ML error adding ${email} to ${groupId}:`, await res.text().then(t => t.slice(0, 200)));
  return res.ok;
}

function detectLang(email: string, metadata: any): 'ES' | 'EN' | 'BR' {
  const lang = metadata?.language || metadata?.lang || '';
  if (lang === 'pt' || lang === 'pt-BR') return 'BR';
  if (lang.startsWith('es')) return 'ES';
  if (lang.startsWith('en')) return 'EN';
  if (email.endsWith('.br')) return 'BR';
  return 'ES';
}

async function wasRecentlySent(supabase: any, userId: string, notifType: string, cooldownDays: number): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - cooldownDays);
  const { data } = await supabase.from('notification_log').select('id')
    .eq('user_id', userId).eq('notification_type', notifType)
    .gte('sent_at', since.toISOString()).limit(1);
  return (data?.length ?? 0) > 0;
}

async function logNotification(supabase: any, userId: string, notifType: string, metadata: any = {}) {
  await supabase.from('notification_log').insert({ user_id: userId, notification_type: notifType, metadata });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth: accept cron secret or service role key
  const cronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronEnv = Deno.env.get('CRON_SECRET');
  
  const isAuthorized = (cronSecret && cronSecret === cronEnv) ||
                       (authHeader && authHeader === serviceRoleKey);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-08-27.basil' });
  const ML_KEY = Deno.env.get('MAILERLITE_API_KEY')!;
  const now = new Date();
  const stats = { renovacion_pronto: 0, renovacion_urgente: 0, pocos_creditos: 0, creditos_criticos: 0, sin_creditos: 0, single_recompra: 0, aniversario: 0, errors: 0 };

  const { data: profiles } = await supabase.from('profiles')
    .select('user_id, subscription_plan, available_credits, stripe_customer_id, created_at')
    .neq('is_blocked', true);

  if (!profiles) return new Response(JSON.stringify({ error: 'DB error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  log(`Processing ${profiles.length} profiles`);

  for (const profile of profiles) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const lang = detectLang(email, authUser?.user?.user_metadata);
      const credits = profile.available_credits ?? 0;
      const plan = profile.subscription_plan;
      const daysSinceReg = Math.floor((now.getTime() - new Date(profile.created_at).getTime()) / 86400000);

      // Aviso 7 — Aniversario sin plan
      if (plan === 'Free' && daysSinceReg >= 365 && daysSinceReg <= 367) {
        if (!await wasRecentlySent(supabase, profile.user_id, 'aniversario', 30)) {
          if (await mlAddToGroup(email, ML_GROUPS.aniversario[lang], ML_KEY)) {
            await logNotification(supabase, profile.user_id, 'aniversario', { lang, days: daysSinceReg });
            stats.aniversario++;
          }
        }
      }

      if (plan === 'Monthly' || plan === 'Annual') {
        // Aviso 5 — Sin créditos
        if (credits === 0) {
          if (!await wasRecentlySent(supabase, profile.user_id, 'sin_creditos', 7)) {
            if (await mlAddToGroup(email, ML_GROUPS.sin_creditos[lang], ML_KEY)) {
              await logNotification(supabase, profile.user_id, 'sin_creditos', { lang, credits });
              stats.sin_creditos++;
            }
          }
        }

        // Calcular tier del plan
        let planCredits = 8;
        if (plan === 'Annual' && profile.stripe_customer_id) {
          try {
            const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 1 });
            if (subs.data.length > 0) {
              const priceId = subs.data[0].items.data[0]?.price?.id;
              if (priceId && PRICE_TO_PLAN[priceId]) planCredits = PLAN_CREDITS[PRICE_TO_PLAN[priceId]];
            }
          } catch {}
        }

        const threshold20 = Math.ceil(planCredits * 0.20);

        // Aviso 2b — Créditos críticos (≤5)
        if (credits > 0 && credits <= 5) {
          if (!await wasRecentlySent(supabase, profile.user_id, 'creditos_criticos', 14)) {
            if (await mlAddToGroup(email, ML_GROUPS.creditos_criticos[lang], ML_KEY)) {
              await logNotification(supabase, profile.user_id, 'creditos_criticos', { lang, credits });
              stats.creditos_criticos++;
            }
          }
        // Aviso 2a — Pocos créditos (≤20% pero >5)
        } else if (credits > 5 && credits <= threshold20) {
          if (!await wasRecentlySent(supabase, profile.user_id, 'pocos_creditos', 14)) {
            if (await mlAddToGroup(email, ML_GROUPS.pocos_creditos[lang], ML_KEY)) {
              await logNotification(supabase, profile.user_id, 'pocos_creditos', { lang, credits, threshold: threshold20 });
              stats.pocos_creditos++;
            }
          }
        }

        // Avisos 1a y 1b — Renovación anual
        if (plan === 'Annual' && profile.stripe_customer_id) {
          try {
            const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 1 });
            if (subs.data.length > 0 && !subs.data[0].cancel_at_period_end) {
              const daysToRenewal = Math.floor((new Date(subs.data[0].current_period_end * 1000).getTime() - now.getTime()) / 86400000);
              if (daysToRenewal <= 30 && daysToRenewal > 7) {
                if (!await wasRecentlySent(supabase, profile.user_id, 'renovacion_pronto', 20)) {
                  if (await mlAddToGroup(email, ML_GROUPS.renovacion_pronto[lang], ML_KEY)) {
                    await logNotification(supabase, profile.user_id, 'renovacion_pronto', { lang, days: daysToRenewal });
                    stats.renovacion_pronto++;
                  }
                }
              }
              if (daysToRenewal <= 7 && daysToRenewal >= 0) {
                if (!await wasRecentlySent(supabase, profile.user_id, 'renovacion_urgente', 7)) {
                  if (await mlAddToGroup(email, ML_GROUPS.renovacion_urgente[lang], ML_KEY)) {
                    await logNotification(supabase, profile.user_id, 'renovacion_urgente', { lang, days: daysToRenewal });
                    stats.renovacion_urgente++;
                  }
                }
              }
            }
          } catch {}
        }
      }

      // Aviso 4 — Single recompra → proponer suscripción
      if (plan === 'Free') {
        const { data: singles } = await supabase.from('credit_transactions')
          .select('id').eq('user_id', profile.user_id).eq('type', 'subscription')
          .ilike('description', '%individual%');
        if (singles && singles.length >= 2) {
          if (!await wasRecentlySent(supabase, profile.user_id, 'single_recompra', 30)) {
            if (await mlAddToGroup(email, ML_GROUPS.single_recompra[lang], ML_KEY)) {
              await logNotification(supabase, profile.user_id, 'single_recompra', { lang, purchases: singles.length });
              stats.single_recompra++;
            }
          }
        }
      }

    } catch (err: any) {
      log(`Error user ${profile.user_id}:`, err.message);
      stats.errors++;
    }
  }

  log('Done', stats);
  return new Response(JSON.stringify({ success: true, processed: profiles.length, stats }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
