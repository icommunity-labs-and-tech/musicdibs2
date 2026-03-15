import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // ── Rate limiting: máx 3 generaciones por usuario en 60 segundos ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const AUDIO_LIMIT = 3;
    const WINDOW_SECS = 60;
    const windowStart = new Date(Date.now() - WINDOW_SECS * 1000).toISOString();

    const { count: recentCalls } = await supabaseAdmin
      .from('ai_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('function_name', 'generate-audio')
      .gte('called_at', windowStart);

    if ((recentCalls ?? 0) >= AUDIO_LIMIT) {
      console.warn(`[GENERATE-AUDIO] Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: `Máximo ${AUDIO_LIMIT} generaciones por minuto. Espera unos segundos e inténtalo de nuevo.`,
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
      .insert({ user_id: userId, function_name: 'generate-audio' });
    // ── Fin rate limiting ──

    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
    
    if (!STABILITY_API_KEY) {
      console.error('[GENERATE-AUDIO] Missing STABILITY_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, duration, cfgScale = 7 } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clampedDuration = Math.max(5, Math.min(180, duration || 30));

    console.log(`[GENERATE-AUDIO] Generating: "${prompt.substring(0, 50)}..." | ${clampedDuration}s | cfg: ${cfgScale}`);

    const STABILITY_API_URL = 'https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio';

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('duration', String(clampedDuration));
    formData.append('cfg_scale', String(cfgScale));
    formData.append('steps', '50');
    formData.append('output_format', 'mp3');

    const response = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GENERATE-AUDIO] Stability API error: ${response.status} - ${errorText}`);
      
      if (response.status === 402 || errorText.toLowerCase().includes('credits')) {
        return new Response(
          JSON.stringify({ 
            error: 'insufficient_credits',
            message: 'Sin créditos disponibles en Stability AI',
            details: 'Tu cuenta de Stability AI no tiene créditos suficientes. Por favor, recarga créditos en platform.stability.ai para continuar generando audio.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await response.json();

    if (!payload?.audio) {
      console.error('[GENERATE-AUDIO] Invalid response payload:', payload);
      return new Response(
        JSON.stringify({ error: 'Generation failed: invalid audio response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GENERATE-AUDIO] Success! Received base64 audio (${payload.audio.length} chars)`);

    return new Response(
      JSON.stringify({ 
        audio: payload.audio,
        format: 'audio/mpeg',
        duration: clampedDuration,
        seed: payload.seed ?? null,
        finish_reason: payload.finish_reason ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-AUDIO] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
