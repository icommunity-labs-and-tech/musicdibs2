import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FAL_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const FAL_QUEUE_URL = `https://queue.fal.run/${FAL_MODEL}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    if (!FAL_API_KEY) throw new Error('FAL_API_KEY is not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { action, promptText, duration, requestId } = await req.json();

    const falHeaders = {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // ── Action: check status ──
    if (action === 'status') {
      if (!requestId) throw new Error('requestId is required for status check');

      const statusRes = await fetch(`${FAL_QUEUE_URL}/requests/${requestId}/status?logs=1`, {
        headers: falHeaders,
      });

      if (!statusRes.ok) {
        const errorText = await statusRes.text();
        console.error(`[GENERATE-VIDEO] fal status error: ${statusRes.status} - ${errorText}`);
        throw new Error(`fal.ai status error: ${statusRes.status}`);
      }

      const statusData = await statusRes.json();

      // If completed, fetch the result
      if (statusData.status === 'COMPLETED') {
        const resultRes = await fetch(`${FAL_QUEUE_URL}/requests/${requestId}`, {
          headers: falHeaders,
        });
        if (!resultRes.ok) {
          throw new Error(`fal.ai result error: ${resultRes.status}`);
        }
        const resultData = await resultRes.json();
        return new Response(JSON.stringify({
          status: 'SUCCEEDED',
          video_url: resultData.video?.url ?? null,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (statusData.status === 'FAILED') {
        return new Response(JSON.stringify({
          status: 'FAILED',
          failure: statusData.error ?? 'Unknown error',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Still processing
      return new Response(JSON.stringify({
        status: 'PENDING',
        queue_position: statusData.queue_position ?? null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Action: generate ──
    if (action === 'generate') {
      if (!promptText) throw new Error('promptText is required');

      // Rate limiting
      const VIDEO_LIMIT = 1;
      const WINDOW_SECS = 60;
      const windowStart = new Date(Date.now() - WINDOW_SECS * 1000).toISOString();

      const { count: recentCalls } = await supabaseAdmin
        .from('ai_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('function_name', 'generate-video')
        .gte('called_at', windowStart);

      if ((recentCalls ?? 0) >= VIDEO_LIMIT) {
        return new Response(
          JSON.stringify({
            error: 'rate_limit_exceeded',
            message: `Máximo ${VIDEO_LIMIT} generación de vídeo por minuto. Espera unos segundos e inténtalo de nuevo.`,
            retryAfter: WINDOW_SECS,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(WINDOW_SECS) } }
        );
      }

      await supabaseAdmin.from('ai_rate_limits').insert({ user_id: userId, function_name: 'generate-video' });

      // Credit deduction
      const CREDITS_COST = 6;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('available_credits')
        .eq('user_id', userId)
        .single();

      if (!profile || profile.available_credits < CREDITS_COST) {
        return new Response(JSON.stringify({ error: 'insufficient_credits', available: profile?.available_credits ?? 0, required: CREDITS_COST }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabaseAdmin.from('profiles').update({
        available_credits: profile.available_credits - CREDITS_COST,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('available_credits', profile.available_credits);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: userId,
        amount: -CREDITS_COST,
        type: 'usage',
        description: `Video AI: ${promptText.slice(0, 80)}`,
      });

      const refundCredits = async (reason: string) => {
        const { data: p } = await supabaseAdmin.from('profiles').select('available_credits').eq('user_id', userId).single();
        if (p) {
          await supabaseAdmin.from('profiles').update({
            available_credits: p.available_credits + CREDITS_COST,
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId);
          await supabaseAdmin.from('credit_transactions').insert({
            user_id: userId,
            amount: CREDITS_COST,
            type: 'refund',
            description: `Reembolso: ${reason}`.slice(0, 200),
          });
          console.log(`[GENERATE-VIDEO] Refunded ${CREDITS_COST} credits to user ${userId}: ${reason}`);
        }
      };

      // Submit to fal.ai queue
      const body = {
        prompt: promptText,
        duration: String(duration || 5),
        aspect_ratio: '16:9',
      };

      console.log(`[GENERATE-VIDEO] Submitting to fal.ai: "${promptText.slice(0, 60)}..." | ${duration}s`);

      const response = await fetch(FAL_QUEUE_URL, {
        method: 'POST',
        headers: falHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GENERATE-VIDEO] fal.ai error: ${response.status} - ${errorText}`);

        if (response.status === 429) {
          await refundCredits('Rate limit fal.ai');
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait and try again.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await refundCredits(`Error fal.ai: ${response.status}`);
        throw new Error(`fal.ai error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[GENERATE-VIDEO] Queue request submitted: ${data.request_id}, ${CREDITS_COST} credits charged`);

      return new Response(JSON.stringify({ requestId: data.request_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[GENERATE-VIDEO] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
