import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FAL_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const FAL_SUBMIT_URL = `https://queue.fal.run/${FAL_MODEL}`;
const FAL_QUEUE_PATH_PREFIX = `/${FAL_MODEL}/requests/`;

const jsonResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });

const isAllowedFalQueueUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.host === 'queue.fal.run' && url.pathname.startsWith(FAL_QUEUE_PATH_PREFIX);
  } catch {
    return false;
  }
};

const withLogsParam = (url: string) => (url.includes('?') ? `${url}&logs=1` : `${url}?logs=1`);
const getFallbackStatusUrl = (requestId: string) => `${FAL_SUBMIT_URL}/requests/${requestId}/status`;
const getFallbackResponseUrl = (requestId: string) => `${FAL_SUBMIT_URL}/requests/${requestId}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userId = user.id;

    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    if (!FAL_API_KEY) throw new Error('FAL_API_KEY is not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { action, promptText, duration, requestId, statusUrl } = await req.json();

    const falHeaders = {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (action === 'status') {
      const resolvedStatusUrl = isAllowedFalQueueUrl(statusUrl)
        ? statusUrl
        : typeof requestId === 'string' && requestId
          ? getFallbackStatusUrl(requestId)
          : null;

      if (!resolvedStatusUrl) {
        throw new Error('statusUrl or requestId is required for status check');
      }

      const statusRes = await fetch(withLogsParam(resolvedStatusUrl), {
        method: 'GET',
        headers: falHeaders,
      });

      if (!statusRes.ok) {
        const errorText = await statusRes.text();
        console.error(`[GENERATE-VIDEO] fal status error: ${statusRes.status} - ${errorText}`);
        throw new Error(`fal.ai status error: ${statusRes.status}`);
      }

      const statusData = await statusRes.json();

      if (statusData.status === 'COMPLETED') {
        if (statusData.error) {
          return jsonResponse({
            status: 'FAILED',
            failure: statusData.error,
          });
        }

        const resolvedResponseUrl = isAllowedFalQueueUrl(statusData.response_url)
          ? statusData.response_url
          : typeof requestId === 'string' && requestId
            ? getFallbackResponseUrl(requestId)
            : null;

        if (!resolvedResponseUrl) {
          throw new Error('fal.ai response URL missing');
        }

        const resultRes = await fetch(resolvedResponseUrl, {
          method: 'GET',
          headers: falHeaders,
        });

        if (!resultRes.ok) {
          const errorText = await resultRes.text();
          console.error(`[GENERATE-VIDEO] fal result error: ${resultRes.status} - ${errorText}`);
          throw new Error(`fal.ai result error: ${resultRes.status}`);
        }

        const resultData = await resultRes.json();
        const videoUrl = resultData.video?.url ?? resultData.video_url ?? resultData.output?.video?.url ?? null;

        if (!videoUrl) {
          return jsonResponse({
            status: 'FAILED',
            failure: 'fal.ai completed without a video URL',
          });
        }

        return jsonResponse({
          status: 'SUCCEEDED',
          video_url: videoUrl,
        });
      }

      if (statusData.status === 'FAILED') {
        return jsonResponse({
          status: 'FAILED',
          failure: statusData.error ?? 'Unknown error',
        });
      }

      return jsonResponse({
        status: 'PENDING',
        queue_position: statusData.queue_position ?? null,
      });
    }

    if (action === 'generate') {
      if (!promptText) throw new Error('promptText is required');

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
        return jsonResponse(
          {
            error: 'rate_limit_exceeded',
            message: `Máximo ${VIDEO_LIMIT} generación de vídeo por minuto. Espera unos segundos e inténtalo de nuevo.`,
            retryAfter: WINDOW_SECS,
          },
          429,
          { 'Retry-After': String(WINDOW_SECS) }
        );
      }

      await supabaseAdmin.from('ai_rate_limits').insert({ user_id: userId, function_name: 'generate-video' });

      const CREDITS_COST = 6;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('available_credits')
        .eq('user_id', userId)
        .single();

      if (!profile || profile.available_credits < CREDITS_COST) {
        return jsonResponse({
          error: 'insufficient_credits',
          available: profile?.available_credits ?? 0,
          required: CREDITS_COST,
        }, 402);
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

      const body = {
        prompt: promptText,
        duration: String(duration || 5),
        aspect_ratio: '16:9',
      };

      console.log(`[GENERATE-VIDEO] Submitting to fal.ai: "${promptText.slice(0, 60)}..." | ${duration}s`);

      const response = await fetch(FAL_SUBMIT_URL, {
        method: 'POST',
        headers: falHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GENERATE-VIDEO] fal.ai error: ${response.status} - ${errorText}`);

        if (response.status === 429) {
          await refundCredits('Rate limit fal.ai');
          return jsonResponse({ error: 'Rate limit exceeded. Please wait and try again.' }, 429);
        }

        await refundCredits(`Error fal.ai: ${response.status}`);
        throw new Error(`fal.ai error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const nextRequestId = data.request_id;
      const nextStatusUrl = isAllowedFalQueueUrl(data.status_url)
        ? data.status_url
        : getFallbackStatusUrl(nextRequestId);
      const nextResponseUrl = isAllowedFalQueueUrl(data.response_url)
        ? data.response_url
        : getFallbackResponseUrl(nextRequestId);

      console.log(`[GENERATE-VIDEO] Queue request submitted: ${nextRequestId}, ${CREDITS_COST} credits charged`);

      return jsonResponse({
        requestId: nextRequestId,
        statusUrl: nextStatusUrl,
        responseUrl: nextResponseUrl,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[GENERATE-VIDEO] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
