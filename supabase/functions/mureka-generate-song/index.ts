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

    // ── Read credit cost from operation_pricing ──
    let CREDITS_COST = 3;
    try {
      const { data: pricing } = await supabase
        .from('operation_pricing')
        .select('credits_cost')
        .eq('operation_key', 'generate_audio_song')
        .maybeSingle();
      if (pricing?.credits_cost && pricing.credits_cost > 0) {
        CREDITS_COST = pricing.credits_cost;
      }
    } catch (e) {
      console.warn('[MUREKA-GENERATE] Could not read operation_pricing, using fallback 3 credits', e);
    }

    // ── Check available credits ──
    const { data: profile } = await supabase
      .from('profiles')
      .select('available_credits')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.available_credits < CREDITS_COST) {
      return new Response(JSON.stringify({
        error: 'insufficient_credits',
        available: profile?.available_credits ?? 0,
        required: CREDITS_COST
      }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Deduct credits upfront ──
    await supabase.from('profiles').update({
      available_credits: profile.available_credits - CREDITS_COST,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id).eq('available_credits', profile.available_credits);

    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -CREDITS_COST,
      type: 'usage',
      description: 'Generación canción con voz (Mureka)',
    });

    // ── Refund helper ──
    const refundCredits = async (reason: string) => {
      const { data: p } = await supabase.from('profiles').select('available_credits').eq('user_id', user.id).single();
      if (p) {
        await supabase.from('profiles').update({
          available_credits: p.available_credits + CREDITS_COST,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
        await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: CREDITS_COST,
          type: 'refund',
          description: `Reembolso: ${reason}`.slice(0, 200),
        });
        console.log(`[MUREKA-GENERATE] Refunded ${CREDITS_COST} credits to ${user.id}: ${reason}`);
      }
    };

    console.log(`[MUREKA-GENERATE] User ${user.id}, prompt: "${fullPrompt}", vocal_id: ${mureka_vocal_id}, cost: ${CREDITS_COST}`);

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
      await refundCredits(`Error Mureka API: ${murekaRes.status}`);
      return new Response(JSON.stringify({ error: 'Mureka generation failed', details: err }), {
        status: murekaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const taskData = await murekaRes.json();
    const taskId = taskData.id;

    console.log(`[MUREKA-GENERATE] Task created: ${taskId}`);

    // Polling hasta completar (máx 3 minutos)
    const maxAttempts = 36;
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
        await refundCredits('Mureka generation failed');
        return new Response(JSON.stringify({ error: 'Mureka generation failed', details: queryData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (!result) {
      await refundCredits('Timeout tras 3 minutos');
      return new Response(JSON.stringify({ error: 'Generation timeout after 3 minutes' }), {
        status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const songs = result.songs || result.choices || [];
    const firstSong = songs[0];
    const audioUrl = firstSong?.audio_url || firstSong?.url || firstSong?.mp3_url;

    if (!audioUrl) {
      await refundCredits('No audio URL en resultado');
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

    console.log(`[MUREKA-GENERATE] Done, generation: ${generation?.id}, ${CREDITS_COST} credits charged`);

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
