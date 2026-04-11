import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ── fal.ai config ── */
const FAL_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const FAL_SUBMIT_URL = `https://queue.fal.run/${FAL_MODEL}`;
const FAL_QUEUE_BASE_URL = 'https://queue.fal.run/fal-ai/kling-video';

/* ── Runway config ── */
const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

type Provider = 'fal' | 'runway';

const jsonResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });

const isAllowedFalQueueUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.host === 'queue.fal.run';
  } catch {
    return false;
  }
};

const withLogsParam = (url: string) => (url.includes('?') ? `${url}&logs=1` : `${url}?logs=1`);
const getFallbackStatusUrl = (requestId: string) => `${FAL_QUEUE_BASE_URL}/requests/${requestId}/status`;
const getFallbackResponseUrl = (requestId: string) => `${FAL_QUEUE_BASE_URL}/requests/${requestId}`;

/* ── Runway helpers ── */
const mapAspectToRunway = (ar: string): string => {
  const map: Record<string, string> = {
    '16:9': '1280:720', '9:16': '720:1280',
    '1:1': '720:720', '4:3': '960:720', '3:4': '720:960',
  };
  return map[ar] || '1280:720';
};

const mapDurationToRunway = (d: number): number => (d >= 10 ? 10 : 5);

/* ── fal.ai status handler ── */
async function handleFalStatus(falHeaders: Record<string, string>, statusUrl: string | null, requestId: string | null) {
  const resolvedStatusUrl = isAllowedFalQueueUrl(statusUrl)
    ? statusUrl
    : (typeof requestId === 'string' && requestId)
      ? getFallbackStatusUrl(requestId)
      : null;

  if (!resolvedStatusUrl) throw new Error('statusUrl or requestId is required for status check');

  const statusRes = await fetch(withLogsParam(resolvedStatusUrl), {
    method: 'GET',
    headers: falHeaders,
  });

  if (!statusRes.ok) {
    const errorText = await statusRes.text();
    console.error(`[VIDEO] fal status error: ${statusRes.status} - ${errorText}`);
    throw new Error(`fal.ai status error: ${statusRes.status}`);
  }

  const statusData = await statusRes.json();

  if (statusData.status === 'COMPLETED') {
    if (statusData.error) {
      return { status: 'FAILED', failure: statusData.error };
    }

    const resolvedResponseUrl = isAllowedFalQueueUrl(statusData.response_url)
      ? statusData.response_url
      : (typeof requestId === 'string' && requestId)
        ? getFallbackResponseUrl(requestId)
        : null;

    if (!resolvedResponseUrl) throw new Error('fal.ai response URL missing');

    const resultRes = await fetch(resolvedResponseUrl, { method: 'GET', headers: falHeaders });
    if (!resultRes.ok) {
      const errorText = await resultRes.text();
      console.error(`[VIDEO] fal result error: ${resultRes.status} - ${errorText}`);
      throw new Error(`fal.ai result error: ${resultRes.status}`);
    }

    const resultData = await resultRes.json();
    const videoUrl = resultData.video?.url ?? resultData.video_url ?? resultData.output?.video?.url ?? null;

    if (!videoUrl) return { status: 'FAILED', failure: 'fal.ai completed without a video URL' };
    return { status: 'SUCCEEDED', video_url: videoUrl };
  }

  if (statusData.status === 'FAILED') {
    return { status: 'FAILED', failure: statusData.error ?? 'Unknown error' };
  }

  return { status: 'PENDING', queue_position: statusData.queue_position ?? null };
}

/* ── Runway status handler ── */
async function handleRunwayStatus(runwayKey: string, requestId: string) {
  const statusRes = await fetch(`${RUNWAY_API_BASE}/tasks/${requestId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${runwayKey}`,
      'X-Runway-Version': '2024-11-06',
    },
  });

  if (!statusRes.ok) {
    const errorText = await statusRes.text();
    console.error(`[VIDEO] Runway status error: ${statusRes.status} - ${errorText}`);
    throw new Error(`Runway status error: ${statusRes.status}`);
  }

  const data = await statusRes.json();
  console.log(`[VIDEO] Runway task ${requestId}: status=${data.status}`);

  if (data.status === 'SUCCEEDED') {
    const videoUrl = data.output?.[0] ?? null;
    if (!videoUrl) return { status: 'FAILED', failure: 'Runway completed without a video URL' };
    return { status: 'SUCCEEDED', video_url: videoUrl };
  }

  if (data.status === 'FAILED') {
    return { status: 'FAILED', failure: data.failure ?? data.failureCode ?? 'Runway generation failed' };
  }

  // RUNNING, THROTTLED, PENDING
  return { status: 'PENDING', queue_position: null };
}

/* ── fal.ai submit ── */
async function submitFal(
  falKey: string,
  promptText: string,
  duration: number,
  aspectRatio: string,
  imageBase64?: string,
): Promise<{ requestId: string; statusUrl: string } | null> {
  const falHeaders = { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' };

  let submitUrl = FAL_SUBMIT_URL;
  const body: Record<string, unknown> = {
    prompt: promptText,
    duration: String(duration || 10),
    aspect_ratio: aspectRatio,
  };

  if (imageBase64) {
    submitUrl = 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
    body.image_url = `data:image/jpeg;base64,${imageBase64}`;
  }

  console.log(`[VIDEO] Submitting to fal.ai: "${promptText.slice(0, 60)}..."`);

  try {
    const response = await fetch(submitUrl, {
      method: 'POST',
      headers: falHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VIDEO] fal.ai submit error: ${response.status} - ${errorText}`);
      return null; // signal to try fallback
    }

    const data = await response.json();
    const nextRequestId = data.request_id;
    const nextStatusUrl = isAllowedFalQueueUrl(data.status_url)
      ? data.status_url
      : getFallbackStatusUrl(nextRequestId);

    return { requestId: nextRequestId, statusUrl: nextStatusUrl };
  } catch (e) {
    console.error('[VIDEO] fal.ai network error:', e);
    return null;
  }
}

/* ── Runway submit ── */
async function submitRunway(
  runwayKey: string,
  promptText: string,
  duration: number,
  aspectRatio: string,
  imageBase64?: string,
): Promise<{ requestId: string } | null> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${runwayKey}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': '2024-11-06',
  };

  const body: Record<string, unknown> = {
    model: 'gen4_turbo',
    ratio: mapAspectToRunway(aspectRatio),
    duration: mapDurationToRunway(duration),
    promptText,
  };

  if (imageBase64) {
    body.promptImage = `data:image/jpeg;base64,${imageBase64}`;
  }

  console.log(`[VIDEO] Submitting to Runway fallback: "${promptText.slice(0, 60)}..."`);

  try {
    const response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VIDEO] Runway submit error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[VIDEO] Runway task created: ${data.id}`);
    return { requestId: data.id };
  } catch (e) {
    console.error('[VIDEO] Runway network error:', e);
    return null;
  }
}

/* ── Main handler ── */
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
    const RUNWAY_API_KEY = Deno.env.get('RUNWAY_API_KEY');
    if (!FAL_API_KEY) throw new Error('FAL_API_KEY is not configured');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { action, promptText, duration, requestId, statusUrl, aspectRatio, imageBase64, provider } = await req.json();

    /* ── STATUS action ── */
    if (action === 'status') {
      const resolvedProvider: Provider = provider === 'runway' ? 'runway' : 'fal';

      if (resolvedProvider === 'runway') {
        if (!RUNWAY_API_KEY) throw new Error('RUNWAY_API_KEY not configured');
        if (!requestId) throw new Error('requestId is required');
        const result = await handleRunwayStatus(RUNWAY_API_KEY, requestId);
        return jsonResponse(result);
      }

      // fal.ai status
      const falHeaders = { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' };
      const result = await handleFalStatus(falHeaders, statusUrl, requestId);
      return jsonResponse(result);
    }

    /* ── GENERATE action ── */
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

      const CREDITS_COST = 3;
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

          console.log(`[VIDEO] Refunded ${CREDITS_COST} credits to user ${userId}: ${reason}`);
        }
      };

      const resolvedAspectRatio = aspectRatio || '16:9';
      const resolvedDuration = duration || 10;

      // 1. Try fal.ai (primary)
      const falResult = await submitFal(FAL_API_KEY, promptText, resolvedDuration, resolvedAspectRatio, imageBase64);

      if (falResult) {
        console.log(`[VIDEO] fal.ai queue request: ${falResult.requestId}, ${CREDITS_COST} credits charged`);
        return jsonResponse({
          requestId: falResult.requestId,
          statusUrl: falResult.statusUrl,
          provider: 'fal',
        });
      }

      // 2. Try Runway (fallback)
      if (RUNWAY_API_KEY) {
        console.log('[VIDEO] fal.ai failed, trying Runway fallback…');
        const runwayResult = await submitRunway(RUNWAY_API_KEY, promptText, resolvedDuration, resolvedAspectRatio, imageBase64);

        if (runwayResult) {
          console.log(`[VIDEO] Runway task created: ${runwayResult.requestId}, ${CREDITS_COST} credits charged`);
          return jsonResponse({
            requestId: runwayResult.requestId,
            statusUrl: null,
            provider: 'runway',
          });
        }
      }

      // All providers failed — refund
      await refundCredits('All video providers failed');
      return jsonResponse({ error: 'All video generation providers are currently unavailable. Please try again later.' }, 503);
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[VIDEO] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
