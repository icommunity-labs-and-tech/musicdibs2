import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Rate limiting: max 3 generations per user in 60 seconds
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
      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: `Máximo ${AUDIO_LIMIT} generaciones por minuto. Espera unos segundos e inténtalo de nuevo.`,
          retryAfter: WINDOW_SECS,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(WINDOW_SECS) } }
      );
    }

    await supabaseAdmin.from('ai_rate_limits').insert({ user_id: userId, function_name: 'generate-audio' });

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, lyrics, genre, mood, duration, mode } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build enriched prompt for ElevenLabs Music API
    // IMPORTANT: Do NOT include raw lyrics in the prompt — they often trigger
    // ElevenLabs content-policy filters. Only send a clean musical description.
    const parts: string[] = [];
    if (genre) parts.push(genre);
    if (mood) parts.push(mood);
    if (mode === 'song') parts.push('song with vocals');
    if (mode === 'instrumental') parts.push('instrumental');
    // Sanitise the user prompt: strip any quoted song titles or artist names
    // that could be flagged as copyright references.
    const cleanPrompt = prompt
      .replace(/["«»""]/g, '')          // remove quotation marks
      .replace(/\b(estilo|style)\s+(de|of)\s+.{1,60}/gi, '') // strip "estilo de <artist>"
      .trim();
    if (cleanPrompt) parts.push(cleanPrompt);
    const enrichedPrompt = parts.join('. ');

    console.log(`[GENERATE-AUDIO] ElevenLabs Music: mode=${mode || 'song'} | "${enrichedPrompt.substring(0, 100)}"`);

    const response = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enrichedPrompt,
        duration_seconds: duration || 60,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[GENERATE-AUDIO] ElevenLabs error: ${response.status} - ${errText}`);

      // Check for insufficient credits
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'insufficient_credits', message: 'Créditos de ElevenLabs insuficientes', details: errText }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}`, details: errText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`[GENERATE-AUDIO] Success! Audio size: ${audioBuffer.byteLength} bytes`);

    return new Response(
      JSON.stringify({
        audio: base64Audio,
        format: 'audio/mpeg',
        duration: duration || 60,
        provider: 'elevenlabs',
        status: 'completed',
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
