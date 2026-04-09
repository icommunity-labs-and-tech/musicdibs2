import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
    if (!MUREKA_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing MUREKA_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, lyrics, mureka_vocal_id } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fullPrompt = prompt;

    console.log(`[MUREKA-GENERATE] User ${user.id}, prompt: "${fullPrompt}", vocal_id: ${mureka_vocal_id}`);

    // Llamar a Mureka /v1/song/generate
    const body: Record<string, unknown> = {
      prompt: fullPrompt,
      model: 'mureka-9',
    };
    if (lyrics) body.lyrics = lyrics;
    if (mureka_vocal_id) body.vocal_id = mureka_vocal_id;

    const murekaRes = await fetch('https://api.mureka.ai/v1/song/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MUREKA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!murekaRes.ok) {
      const err = await murekaRes.text();
      console.error('[MUREKA-GENERATE] Error:', err);
      return new Response(JSON.stringify({ error: 'Mureka generation failed', details: err }), {
        status: murekaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const taskData = await murekaRes.json();
    const taskId = taskData.id;

    console.log(`[MUREKA-GENERATE] Task created: ${taskId}`);

    // Polling hasta completar (máx 3 minutos)
    const maxAttempts = 36; // 36 * 5s = 3 min
    let attempts = 0;
    let result = null;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      const queryRes = await fetch(`https://api.mureka.ai/v1/song/query/${taskId}`, {
        headers: { 'Authorization': `Bearer ${MUREKA_API_KEY}` },
      });

      if (!queryRes.ok) continue;

      const queryData = await queryRes.json();
      console.log(`[MUREKA-GENERATE] Attempt ${attempts}: status=${queryData.status}`);

      if (queryData.status === 'succeeded') {
        result = queryData;
        break;
      } else if (queryData.status === 'failed') {
        return new Response(JSON.stringify({ error: 'Mureka generation failed', details: queryData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (!result) {
      return new Response(JSON.stringify({ error: 'Generation timeout after 3 minutes' }), {
        status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mureka devuelve array de canciones (normalmente 2)
    const songs = result.songs || result.choices || [];
    const firstSong = songs[0];
    const audioUrl = firstSong?.audio_url || firstSong?.url || firstSong?.mp3_url;

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: 'No audio URL in result', result }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Guardar en ai_generations
    const { data: generation } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        prompt: fullPrompt,
        audio_url: audioUrl,
        duration: 0,
      })
      .select()
      .single();

    console.log(`[MUREKA-GENERATE] Done, generation: ${generation?.id}`);

    return new Response(JSON.stringify({
      success: true,
      audioUrl,
      generationId: generation?.id,
      songs: songs.map((s: Record<string, unknown>) => ({ url: s.audio_url || s.url || s.mp3_url })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[MUREKA-GENERATE] Fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
