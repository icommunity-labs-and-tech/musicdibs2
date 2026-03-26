import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MUREKA_API_URL = 'https://api.mureka.ai/v1/song/generate';
const POLL_URL = 'https://api.mureka.ai/v1/song/query/';
const MAX_POLLS = 60;
const POLL_INTERVAL_MS = 5000;

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

    // Rate limiting: máx 3 generaciones por usuario en 60 segundos
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

    const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
    if (!MUREKA_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, lyrics, genre, mood, duration, mode } = await req.json();

    if (!prompt && !lyrics) {
      return new Response(JSON.stringify({ error: 'Prompt or lyrics required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Construir el prompt enriquecido para Mureka
    const parts: string[] = [];
    if (genre) parts.push(genre);
    if (mood) parts.push(mood);
    if (prompt) parts.push(prompt);
    const stylePrompt = parts.join(', ');

    console.log(`[GENERATE-AUDIO] Mureka generate: "${stylePrompt.substring(0, 80)}" | lyrics: ${lyrics ? 'yes' : 'no'}`);

    // Llamada inicial a Mureka — genera la tarea
    const body: Record<string, unknown> = {
      prompt: stylePrompt,
      model: 'auto',
    };
    if (lyrics) body.lyrics = lyrics;

    const initRes = await fetch(MUREKA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MUREKA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error(`[GENERATE-AUDIO] Mureka init error: ${initRes.status} - ${errText}`);
      return new Response(
        JSON.stringify({ error: `Generation failed: ${initRes.status}`, details: errText }),
        { status: initRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const initData = await initRes.json();
    const taskId = initData?.id || initData?.task_id;

    if (!taskId) {
      console.error('[GENERATE-AUDIO] No task ID from Mureka:', initData);
      return new Response(
        JSON.stringify({ error: 'No task ID returned from Mureka' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GENERATE-AUDIO] Mureka task created: ${taskId}`);

    // Polling hasta obtener el audio
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

      const pollRes = await fetch(`${POLL_URL}${taskId}`, {
        headers: { 'Authorization': `Bearer ${MUREKA_API_KEY}` },
      });

      if (!pollRes.ok) {
        console.warn(`[GENERATE-AUDIO] Poll ${i + 1} failed: ${pollRes.status}`);
        continue;
      }

      const pollData = await pollRes.json();
      const status = pollData?.status;

      console.log(`[GENERATE-AUDIO] Poll ${i + 1}: status=${status}`);

      if (status === 'succeeded' || status === 'completed') {
        // Mureka devuelve array de canciones — coger la primera
        const songs = pollData?.songs || pollData?.choices || [];
        const audioUrl = songs[0]?.url || songs[0]?.audio_url || pollData?.url;

        if (!audioUrl) {
          console.error('[GENERATE-AUDIO] No audio URL in response:', pollData);
          return new Response(
            JSON.stringify({ error: 'No audio URL in Mureka response' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[GENERATE-AUDIO] Success! Audio URL: ${audioUrl}`);

        // Descargar el audio y convertir a base64 para compatibilidad con el frontend
        const audioRes = await fetch(audioUrl);
        const audioBuffer = await audioRes.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

        return new Response(
          JSON.stringify({
            audio: base64Audio,
            audio_url: audioUrl,
            format: 'audio/mpeg',
            duration: duration || 30,
            provider: 'mureka',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (status === 'failed' || status === 'error') {
        console.error('[GENERATE-AUDIO] Mureka task failed:', pollData);
        return new Response(
          JSON.stringify({ error: 'Mureka generation failed', details: pollData?.error || 'Unknown error' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Generation timeout — Mureka tardó demasiado' }),
      { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-AUDIO] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
