import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function buildCompositionPlan(
  stylePrompt: string,
  lyrics: string,
  apiKey: string,
): Promise<any> {
  const cleanedLyrics = lyrics
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^\[.*\]$/.test(l))
    .join('\n')
    .trim();

  if (!cleanedLyrics) return buildManualPlan(stylePrompt, lyrics);

  try {
    // No music_length_ms — let ElevenLabs decide duration from the plan
    const planResp = await fetch('https://api.elevenlabs.io/v1/music/composition-plan', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: stylePrompt }),
    });

    if (!planResp.ok) {
      const errText = await planResp.text().catch(() => '');
      console.warn(`[GENERATE-AUDIO] composition-plan API failed (${planResp.status}): ${errText.slice(0, 200)} — using manual plan`);
      return buildManualPlan(stylePrompt, cleanedLyrics);
    }

    const plan = await planResp.json();
    const sections: any[] = Array.isArray(plan?.sections) ? plan.sections : [];

    if (sections.length === 0) {
      console.warn('[GENERATE-AUDIO] composition-plan returned 0 sections — using manual plan');
      return buildManualPlan(stylePrompt, cleanedLyrics);
    }

    const isVocal = (s: any): boolean => {
      const name = String(s?.section_name || s?.name || '').toLowerCase();
      const type = String(s?.section_type || s?.type || '').toLowerCase();
      const blocked = ['intro', 'outro', 'instrumental', 'break', 'interlude', 'solo', 'bridge'];
      return !blocked.some(k => name.includes(k) || type.includes(k));
    };

    const vocalIdxs = sections
      .map((s, i) => (isVocal(s) ? i : -1))
      .filter(i => i >= 0);

    if (vocalIdxs.length === 0) {
      console.warn('[GENERATE-AUDIO] No vocal sections found in AI plan — using manual plan');
      return buildManualPlan(stylePrompt, cleanedLyrics);
    }

    const lines = cleanedLyrics.split('\n').filter(l => l.trim());
    const buckets: string[][] = vocalIdxs.map(() => []);
    lines.forEach((line, i) => buckets[i % buckets.length].push(line));

    vocalIdxs.forEach((sIdx, k) => {
      const text = buckets[k].join('\n').trim();
      if (text) sections[sIdx].lyrics = text;
    });

    plan.sections = sections;
    console.log(`[GENERATE-AUDIO] AI composition plan built: ${vocalIdxs.length} vocal sections with lyrics injected`);
    return plan;

  } catch (err) {
    console.warn('[GENERATE-AUDIO] composition-plan exception:', err, '— using manual plan');
    return buildManualPlan(stylePrompt, cleanedLyrics);
  }
}

function buildManualPlan(stylePrompt: string, lyrics: string): any {
  const lines = lyrics.split('\n').filter(l => l.trim());
  const half = Math.ceil(lines.length / 2);
  const verse1Lyrics = lines.slice(0, half).join('\n');
  const verse2Lyrics = lines.slice(half).join('\n') || verse1Lyrics;

  console.log(`[GENERATE-AUDIO] Using manual composition plan with lyrics (${lines.length} lines)`);

  const verse1Lines = verse1Lyrics.split('\n').filter(l => l.trim());
  const verse2Lines = verse2Lyrics.split('\n').filter(l => l.trim());

  // Durations in ms — let the model breathe naturally
  return {
    positive_global_styles: [stylePrompt],
    negative_global_styles: [],
    sections: [
      {
        section_name: 'Intro',
        duration_ms: 10000,
        lines: [],
        positive_local_styles: ['instrumental intro'],
        negative_local_styles: [],
      },
      {
        section_name: 'Verse 1',
        duration_ms: 30000,
        lines: verse1Lines,
        positive_local_styles: ['verse with lead vocals'],
        negative_local_styles: [],
      },
      {
        section_name: 'Chorus',
        duration_ms: 25000,
        lines: verse2Lines,
        positive_local_styles: ['energetic chorus with vocals'],
        negative_local_styles: [],
      },
      {
        section_name: 'Verse 2',
        duration_ms: 30000,
        lines: verse2Lines,
        positive_local_styles: ['verse with lead vocals'],
        negative_local_styles: [],
      },
      {
        section_name: 'Outro',
        duration_ms: 10000,
        lines: [],
        positive_local_styles: ['outro instrumental fade'],
        negative_local_styles: [],
      },
    ],
  };
}

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
        JSON.stringify({ error: 'rate_limit_exceeded', message: `Máximo ${AUDIO_LIMIT} generaciones por minuto.`, retryAfter: WINDOW_SECS }),
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

    const CREDITS_COST = mode === 'song' ? 3 : 2;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('available_credits')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.available_credits < CREDITS_COST) {
      return new Response(
        JSON.stringify({ error: 'insufficient_credits', available: profile?.available_credits ?? 0, required: CREDITS_COST }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const refundCredits = async (reason: string) => {
      const { data: p } = await supabaseAdmin.from('profiles').select('available_credits').eq('user_id', userId).single();
      if (p) {
        await supabaseAdmin.from('profiles').update({
          available_credits: p.available_credits + CREDITS_COST,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
        await supabaseAdmin.from('credit_transactions').insert({
          user_id: userId, amount: CREDITS_COST, type: 'refund',
          description: `Reembolso: ${reason}`.slice(0, 200),
        });
        console.log(`[GENERATE-AUDIO] Refunded ${CREDITS_COST} credits: ${reason}`);
      }
    };

    const parts: string[] = [];
    if (genre) parts.push(genre);
    if (mood) parts.push(mood);
    if (mode === 'song') parts.push('song with vocals');
    if (mode === 'instrumental') parts.push('instrumental');
    const cleanPrompt = prompt.replace(/[«»""]/g, '').replace(/\b(estilo|style)\s+(de|of)\s+.{1,60}/gi, '').trim();
    if (cleanPrompt) parts.push(cleanPrompt);
    const enrichedPrompt = parts.join('. ');

    // Only use explicit duration from frontend if provided and > 0
    const explicitDuration = typeof duration === 'number' && duration > 0 ? duration : null;
    const hasUserLyrics = typeof lyrics === 'string' && lyrics.trim().length > 0 && mode === 'song';

    let compositionPlan: any | null = null;
    if (hasUserLyrics) {
      console.log(`[GENERATE-AUDIO] Lyrics provided (${lyrics.length} chars) — building composition plan`);
      compositionPlan = await buildCompositionPlan(enrichedPrompt, lyrics.trim(), ELEVENLABS_API_KEY);
    }

    console.log(`[GENERATE-AUDIO] mode=${mode || 'instrumental'} | plan=${compositionPlan ? 'YES (lyrics)' : 'NO (prompt-only)'} | lyricsUsed=${hasUserLyrics} | explicitDuration=${explicitDuration} | prompt="${enrichedPrompt.substring(0, 80)}"`);

    // ElevenLabs: composition_plan and prompt are MUTUALLY EXCLUSIVE.
    // When using composition_plan: no music_length_ms (duration defined in sections).
    // When using prompt: include music_length_ms only if user explicitly provided duration.
    const callElevenLabs = async (opts: { plan?: any; promptText?: string }) => {
      const body: Record<string, unknown> = {};
      if (opts.plan) {
        // composition_plan mode — ElevenLabs determines total duration from sections
        body.composition_plan = opts.plan;
      } else {
        body.prompt = opts.promptText;
        // Only set music_length_ms if user explicitly chose a duration
        // Otherwise let ElevenLabs decide the natural length for the prompt
        if (explicitDuration) {
          body.music_length_ms = explicitDuration * 1000;
        }
      }
      return fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    let response = compositionPlan
      ? await callElevenLabs({ plan: compositionPlan })
      : await callElevenLabs({ promptText: enrichedPrompt });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[GENERATE-AUDIO] ElevenLabs error ${response.status}: ${errText.substring(0, 300)}`);

      if (response.status === 400) {
        if (compositionPlan) {
          console.log('[GENERATE-AUDIO] Composition plan rejected — retrying prompt-only');
          response = await callElevenLabs({ promptText: enrichedPrompt });
          if (!response.ok) {
            const retryErr = await response.text();
            await refundCredits(`Plan+prompt rejected: ${response.status}`);
            return new Response(
              JSON.stringify({ error: `Generation failed: ${response.status}`, details: retryErr }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          try {
            const errJson = JSON.parse(errText);
            const suggestion = errJson?.detail?.data?.prompt_suggestion;
            if (errJson?.detail?.status === 'bad_prompt' && suggestion) {
              console.log(`[GENERATE-AUDIO] Retrying with suggested prompt: "${suggestion.substring(0, 80)}"`);
              response = await callElevenLabs({ promptText: suggestion });
              if (!response.ok) {
                await refundCredits(`Fallo reintento: ${response.status}`);
                return new Response(
                  JSON.stringify({ error: `Generation failed: ${response.status}` }),
                  { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } else {
              await refundCredits(`Prompt rechazado: 400`);
              return new Response(
                JSON.stringify({ error: 'Generation failed: 400', details: errText }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch {
            await refundCredits('Fallo generación: 400');
            return new Response(
              JSON.stringify({ error: 'Generation failed: 400', details: errText }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } else {
        await refundCredits(`Error ElevenLabs: ${response.status}`);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'provider_rate_limit' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'provider_unavailable' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);
    const audioBytes = new Uint8Array(audioBuffer);

    // Calculate actual duration from audio size (rough estimate: ~128kbps mp3)
    const actualDurationSecs = Math.round(audioBuffer.byteLength / 16000);
    console.log(`[GENERATE-AUDIO] Success! ${audioBuffer.byteLength} bytes (~${actualDurationSecs}s) | lyricsUsed=${hasUserLyrics} | plan=${!!compositionPlan}`);

    let savedAudioUrl: string | null = null;
    let generationId: string | null = null;
    try {
      const fileName = `${userId}/gen_${Date.now()}.mp3`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('ai-generations')
        .upload(fileName, audioBytes, { contentType: 'audio/mpeg', upsert: false });

      if (!uploadError) {
        const { data: urlData } = await supabaseAdmin.storage.from('ai-generations').createSignedUrl(fileName, 60 * 60 * 24 * 365);
        savedAudioUrl = urlData?.signedUrl || null;
        const { data: gen } = await supabaseAdmin.from('ai_generations').insert({
          user_id: userId,
          prompt: prompt.slice(0, 500),
          audio_url: savedAudioUrl,
          duration: actualDurationSecs,
          genre: genre || null,
          mood: mood || null,
        }).select('id').single();
        generationId = gen?.id || null;
        console.log(`[GENERATE-AUDIO] Saved generation: ${generationId} (${actualDurationSecs}s)`);
      } else {
        console.error('[GENERATE-AUDIO] Upload error:', uploadError);
      }
    } catch (persistErr) {
      console.error('[GENERATE-AUDIO] Persist error (non-fatal):', persistErr);
    }

    return new Response(
      JSON.stringify({
        audio: base64Audio,
        format: 'audio/mpeg',
        duration: actualDurationSecs,
        provider: 'elevenlabs',
        status: 'completed',
        generationId,
        audioUrl: savedAudioUrl,
        lyricsUsed: hasUserLyrics,
        usedCompositionPlan: !!compositionPlan,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-AUDIO] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
