import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    const RUNWAY_API_KEY = Deno.env.get('RUNWAY_API_KEY');
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not configured');
    }

    const { action, mode, promptText, promptImage, ratio, duration, taskId } = await req.json();

    // ── Rate limiting: solo para generate, no para status (polling) ──
    if (action === 'generate') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

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
        console.warn(`[GENERATE-VIDEO] Rate limit exceeded for user ${userId}`);
        return new Response(
          JSON.stringify({
            error: 'rate_limit_exceeded',
            message: `Máximo ${VIDEO_LIMIT} generación de vídeo por minuto. Espera unos segundos e inténtalo de nuevo.`,
            retryAfter: WINDOW_SECS,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(WINDOW_SECS),
            },
          }
        );
      }

      // Registrar esta llamada
      await supabaseAdmin
        .from('ai_rate_limits')
        .insert({ user_id: userId, function_name: 'generate-video' });
    }
    // ── Fin rate limiting ──

    const headers = {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': RUNWAY_API_VERSION,
    };

    // Action: check task status
    if (action === 'status') {
      if (!taskId) throw new Error('taskId is required for status check');

      const response = await fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GENERATE-VIDEO] Runway status error: ${response.status} - ${errorText}`);
        throw new Error(`Runway API error: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: generate video
    if (action === 'generate') {
      if (!promptText) throw new Error('promptText is required');

      const endpoint = mode === 'image_to_video' ? 'image_to_video' : 'text_to_video';
      
      const body: Record<string, unknown> = {
        model: 'gen4_turbo',
        promptText,
        ratio: ratio || '1280:720',
        duration: duration || 5,
      };

      if (mode === 'image_to_video' && promptImage) {
        body.promptImage = promptImage;
      }

      console.log(`[GENERATE-VIDEO] Starting ${endpoint}: "${promptText.slice(0, 60)}..." | ${duration}s | ratio: ${ratio}`);

      const response = await fetch(`${RUNWAY_API_URL}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GENERATE-VIDEO] Runway API error: ${response.status} - ${errorText}`);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait and try again.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Runway returns 400 or 402 for insufficient credits
        if (response.status === 402 || errorText.includes('not have enough credits')) {
          return new Response(JSON.stringify({ error: 'insufficient_credits', provider: 'runway', message: 'No hay créditos suficientes en Runway. Recarga créditos en runway.com.' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        throw new Error(`Runway API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[GENERATE-VIDEO] Task created: ${data.id}`);

      return new Response(JSON.stringify({ taskId: data.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[GENERATE-VIDEO] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
