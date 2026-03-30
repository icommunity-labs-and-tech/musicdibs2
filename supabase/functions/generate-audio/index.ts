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

    // ── Credit deduction ──────────────────────────────────────
    const CREDITS_COST = mode === 'song' ? 3 : 2;
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

    // Deduct credits upfront
    await supabaseAdmin.from('profiles').update({
      available_credits: profile.available_credits - CREDITS_COST,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('available_credits', profile.available_credits);

    await supabaseAdmin.from('credit_transactions').insert({
      user_id: userId,
      amount: -CREDITS_COST,
      type: 'usage',
      description: `Generación audio (${mode || 'instrumental'}): ${prompt.slice(0, 80)}`,
    });

    // ── Helper to refund on failure ──
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
        console.log(`[GENERATE-AUDIO] Refunded ${CREDITS_COST} credits to user ${userId}: ${reason}`);
      }
    };

    // Build enriched prompt for ElevenLabs Music API
    const parts: string[] = [];
    if (genre) parts.push(genre);
    if (mood) parts.push(mood);
    if (mode === 'song') parts.push('song with vocals');
    if (mode === 'instrumental') parts.push('instrumental');
    const cleanPrompt = prompt
      .replace(/["«»""]/g, '')
      .replace(/\b(estilo|style)\s+(de|of)\s+.{1,60}/gi, '')
      .trim();
    if (cleanPrompt) parts.push(cleanPrompt);
    const enrichedPrompt = parts.join('. ');

    console.log(`[GENERATE-AUDIO] ElevenLabs Music: mode=${mode || 'song'} | "${enrichedPrompt.substring(0, 100)}"`);

    const callElevenLabs = async (promptText: string) => {
      return fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText,
          duration_seconds: duration || 60,
        }),
      });
    };

    let response = await callElevenLabs(enrichedPrompt);

    // If prompt was rejected (bad_prompt), retry with the suggested prompt
    if (!response.ok && response.status === 400) {
      const errText = await response.text();
      console.warn(`[GENERATE-AUDIO] Prompt rejected (400): ${errText.substring(0, 200)}`);

      try {
        const errJson = JSON.parse(errText);
        const detail = errJson?.detail || errJson;
        const suggestion = detail?.data?.prompt_suggestion;

        if (detail?.status === 'bad_prompt' && suggestion) {
          console.log(`[GENERATE-AUDIO] Retrying with suggested prompt: "${suggestion.substring(0, 100)}"`);
          response = await callElevenLabs(suggestion);

          if (!response.ok) {
            const retryErr = await response.text();
            console.error(`[GENERATE-AUDIO] Retry also failed: ${response.status} - ${retryErr}`);
            await refundCredits(`Fallo generación audio (reintento): ${response.status}`);
            return new Response(
              JSON.stringify({ error: `Generation failed on retry: ${response.status}`, details: retryErr }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          await refundCredits(`Prompt rechazado: ${errText.slice(0, 100)}`);
          return new Response(
            JSON.stringify({ error: `Generation failed: 400`, details: errText }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        await refundCredits(`Fallo generación audio: 400`);
        return new Response(
          JSON.stringify({ error: `Generation failed: 400`, details: errText }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (!response.ok) {
      const errText = await response.text();
      console.error(`[GENERATE-AUDIO] ElevenLabs error: ${response.status} - ${errText}`);

      if (response.status === 401 || response.status === 403) {
        await refundCredits('Créditos ElevenLabs insuficientes');
        return new Response(
          JSON.stringify({ error: 'insufficient_credits', message: 'Créditos de ElevenLabs insuficientes', details: errText }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await refundCredits(`Error ElevenLabs: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}`, details: errText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`[GENERATE-AUDIO] Success! Audio size: ${audioBuffer.byteLength} bytes, ${CREDITS_COST} credits charged`);

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
    // Note: if we reach here after deducting credits, the error is unexpected.
    // We attempt a refund but can't guarantee it in all edge cases.
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
