import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Routing logic ───────────────────────────────────────────────────────────
//
//  LYRIA 3 PRO  →  default for instrumental and song-without-lyrics ≤ 180s
//  ELEVENLABS   →  when user provides lyrics (exact letter respect)
//                  OR when duration > 180s (Lyria max is ~3 min)
//
// ─────────────────────────────────────────────────────────────────────────────

const LYRIA_MAX_DURATION_SECS = 180;

// ─── Translate prompt to English for Lyria (performs better with English) ────

async function translateToEnglish(text: string, geminiApiKey: string): Promise<string> {
  // If already mostly ASCII/English, skip translation
  const nonAsciiRatio = (text.match(/[^\x00-\x7F]/g) || []).length / text.length;
  if (nonAsciiRatio < 0.05) return text;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate the following music generation prompt to English. Return ONLY the translated text, no explanations, no quotes.\n\n${text}`
            }]
          }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.1 },
        }),
      }
    );
    if (!resp.ok) return text;
    const data = await resp.json();
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (translated && translated.length > 0) {
      console.log(`[GENERATE-AUDIO] Prompt translated to English for Lyria`);
      return translated;
    }
  } catch {
    // Non-fatal: use original prompt
  }
  return text;
}

function shouldUseLyria(opts: {
  hasLyrics: boolean;
  explicitDuration: number | null;
}): boolean {
  if (opts.hasLyrics) return false;             // Lyrics → ElevenLabs always
  if (opts.explicitDuration && opts.explicitDuration > LYRIA_MAX_DURATION_SECS) return false; // >3min → ElevenLabs
  return true;
}

// ─── ElevenLabs helpers (unchanged from original) ────────────────────────────

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

  return {
    positive_global_styles: [stylePrompt],
    negative_global_styles: [],
    sections: [
      { section_name: 'Intro', duration_ms: 10000, lines: [], positive_local_styles: ['instrumental intro'], negative_local_styles: [] },
      { section_name: 'Verse 1', duration_ms: 30000, lines: verse1Lines, positive_local_styles: ['verse with lead vocals'], negative_local_styles: [] },
      { section_name: 'Chorus', duration_ms: 25000, lines: verse2Lines, positive_local_styles: ['energetic chorus with vocals'], negative_local_styles: [] },
      { section_name: 'Verse 2', duration_ms: 30000, lines: verse2Lines, positive_local_styles: ['verse with lead vocals'], negative_local_styles: [] },
      { section_name: 'Outro', duration_ms: 10000, lines: [], positive_local_styles: ['outro instrumental fade'], negative_local_styles: [] },
    ],
  };
}

// ─── Lyria 3 Pro via Gemini API ───────────────────────────────────────────────

async function generateWithLyria(opts: {
  prompt: string;
  explicitDuration: number | null;
  geminiApiKey: string;
}): Promise<{ audioBuffer: ArrayBuffer; songMap: string | null; durationSecs: number }> {
  const { prompt, explicitDuration, geminiApiKey } = opts;

  // Translate to English — Lyria 3 Pro performs significantly better with English prompts
  const englishPrompt = await translateToEnglish(prompt, geminiApiKey);

  // Inject duration hint into prompt if user specified one
  const durationHint = explicitDuration
    ? ` Create a ${explicitDuration}-second song.`
    : '';
  const fullPrompt = `${englishPrompt}${durationHint}`;

  console.log(`[GENERATE-AUDIO] Lyria 3 Pro | prompt="${fullPrompt.slice(0, 80)}" | original="${prompt.slice(0, 40)}" | duration=${explicitDuration ?? 'auto'}`);

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-pro-preview:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
      }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Lyria API error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];

  let audioB64: string | null = null;
  let mimeType = 'audio/mpeg';
  let songMap: string | null = null;

  for (const part of parts) {
    if (part?.inlineData?.mimeType?.startsWith('audio/')) {
      audioB64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType;
    }
    if (part?.text) {
      songMap = part.text; // Lyria returns song map / lyrics as text
    }
  }

  if (!audioB64) {
    throw new Error('Lyria returned no audio in response');
  }

  // Decode base64 → ArrayBuffer
  const binaryStr = atob(audioB64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const audioBuffer = bytes.buffer;

  const durationSecs = Math.round(audioBuffer.byteLength / 16000);
  console.log(`[GENERATE-AUDIO] Lyria OK | ${audioBuffer.byteLength} bytes (~${durationSecs}s) | hasSongMap=${!!songMap}`);

  return { audioBuffer, songMap, durationSecs };
}

// ─── ElevenLabs generation (unchanged from original) ─────────────────────────

async function generateWithElevenLabs(opts: {
  enrichedPrompt: string;
  lyricsAwarePrompt: string;
  hasLyrics: boolean;
  explicitDuration: number | null;
  apiKey: string;
}): Promise<{ audioBuffer: ArrayBuffer; durationSecs: number }> {
  const { enrichedPrompt, lyricsAwarePrompt, hasLyrics, explicitDuration, apiKey } = opts;

  const callElevenLabs = async (callOpts: { plan?: any; promptText?: string }) => {
    const body: Record<string, unknown> = {};
    if (callOpts.plan) {
      body.composition_plan = callOpts.plan;
    } else {
      body.prompt = callOpts.promptText;
      if (explicitDuration) {
        body.music_length_ms = explicitDuration * 1000;
      }
    }
    return fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  let response = await callElevenLabs({ promptText: lyricsAwarePrompt });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`[GENERATE-AUDIO] ElevenLabs error ${response.status}: ${errText.slice(0, 300)}`);

    if (response.status === 400) {
      try {
        const errJson = JSON.parse(errText);
        const suggestion = errJson?.detail?.data?.prompt_suggestion;
        if (errJson?.detail?.status === 'bad_prompt' && suggestion) {
          console.log(`[GENERATE-AUDIO] EL: retrying with suggested prompt: "${suggestion.slice(0, 80)}"`);
          response = await callElevenLabs({ promptText: suggestion });
          if (!response.ok) throw new Error(`EL retry failed: ${response.status}`);
        } else {
          throw new Error(`EL bad_prompt: ${errText.slice(0, 200)}`);
        }
      } catch {
        throw new Error(`EL 400: ${errText.slice(0, 200)}`);
      }
    } else {
      throw new Error(`EL ${response.status}`);
    }
  }

  const audioBuffer = await response.arrayBuffer();
  const durationSecs = Math.round(audioBuffer.byteLength / 16000);
  console.log(`[GENERATE-AUDIO] ElevenLabs OK | ${audioBuffer.byteLength} bytes (~${durationSecs}s) | lyricsUsed=${hasLyrics}`);

  return { audioBuffer, durationSecs };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
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

    // ── Rate limit ──
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

    // ── API keys ──
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: missing ELEVENLABS_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: missing GEMINI_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Request body ──
    const { prompt, lyrics, genre, mood, duration, mode, generation_priority, original_description, original_lyrics } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const explicitDuration: number | null = typeof duration === 'number' && duration > 0 ? duration : null;
    const hasLyrics = typeof lyrics === 'string' && lyrics.trim().length > 0 && mode === 'song';

    // ── Provider router (ai_provider_settings) ──
    const featureKey = mode === 'song' ? 'music_generation_vocal' : 'music_generation_instrumental';
    const { data: activeSettingRows, error: settingErr } = await supabaseAdmin
      .from('ai_provider_settings')
      .select('id, provider, model, fallback_provider, fallback_model, is_enabled, is_active, cost_usd_estimate, priority')
      .eq('feature_key', featureKey)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (settingErr) {
      console.error('[GENERATE-AUDIO][ROUTER] error reading ai_provider_settings:', settingErr.message);
    }
    if ((activeSettingRows?.length ?? 0) > 1) {
      console.warn('[GENERATE-AUDIO][ROUTER] WARNING: multiple is_active rows for', featureKey, '→', activeSettingRows);
    }
    const activeSetting = activeSettingRows?.[0] ?? null;
    console.log('[GENERATE-AUDIO][ROUTER] featureKey=', featureKey, '| activeSetting=', JSON.stringify(activeSetting));

    const configuredProvider = (activeSetting?.is_enabled ? activeSetting?.provider : null) ?? null;
    const fallbackProvider = activeSetting?.fallback_provider ?? null;

    // Lyria can't handle lyrics or >180s — auto-fallback in those cases
    const lyriaCompatible = !hasLyrics && (!explicitDuration || explicitDuration <= LYRIA_MAX_DURATION_SECS);

    // Resolve provider: use configured one if compatible, else fallback, else legacy heuristic
    let provider: 'kie_suno' | 'elevenlabs' | 'lyria' | 'gemini';
    if (configuredProvider === 'lyria' || configuredProvider === 'gemini') {
      provider = lyriaCompatible ? 'lyria' : (fallbackProvider as any) || 'elevenlabs';
    } else if (configuredProvider === 'kie_suno' || configuredProvider === 'elevenlabs') {
      provider = configuredProvider;
    } else {
      // No active config — legacy default
      provider = lyriaCompatible ? 'lyria' : 'elevenlabs';
    }

    const useLyria = provider === 'lyria' || provider === 'gemini';
    const useKie = provider === 'kie_suno';
    const routingReason = configuredProvider
      ? `ai_provider_settings:${configuredProvider}${provider !== configuredProvider ? `→${provider}` : ''}`
      : (hasLyrics ? 'legacy_user_lyrics' : 'legacy_default');

    console.log(`[GENERATE-AUDIO] feature=${featureKey} | provider=${provider} | reason=${routingReason} | hasLyrics=${hasLyrics} | duration=${explicitDuration}`);


    // ── Credits (skipped for KIE; kie-suno-generate debits atomically) ──
    const operationKey = mode === 'song' ? 'song_ai_voice' : 'instrumental_base';
    const { data: pricingRow } = await supabaseAdmin
      .from('operation_pricing')
      .select('credits_cost')
      .eq('operation_key', operationKey)
      .eq('is_active', true)
      .maybeSingle();
    const CREDITS_COST = pricingRow?.credits_cost ?? 3;
    console.log(`[GENERATE-AUDIO] Pricing: ${operationKey} = ${CREDITS_COST} credits`);

    if (!useKie) {
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
        description: `Generación audio (${mode || 'instrumental'}, ${provider}): ${prompt.slice(0, 80)}`,
      });
    }

    const refundCredits = async (reason: string) => {
      if (useKie) return; // KIE handles its own refund inside kie-suno-generate / callback
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


    // ── Build enriched prompt (shared) ──
    const parts: string[] = [];
    if (genre) parts.push(genre);
    if (mood) parts.push(mood);
    if (mode === 'song') parts.push('song with vocals');
    if (mode === 'instrumental') parts.push('instrumental');
    const cleanPrompt = prompt.replace(/[«»""]/g, '').replace(/\b(estilo|style)\s+(de|of)\s+.{1,60}/gi, '').trim();
    if (cleanPrompt) parts.push(cleanPrompt);
    const enrichedPrompt = parts.join('. ');

    // ── Generation priority handling (lyrics_fidelity vs creative) ──
    const priority: 'lyrics_fidelity' | 'creative' =
      generation_priority === 'creative' ? 'creative' : 'lyrics_fidelity';
    const promptMode: 'lyrics' | 'no_lyrics' = hasLyrics ? 'lyrics' : 'no_lyrics';

    let lyricsAwarePrompt: string;
    if (!hasLyrics) {
      lyricsAwarePrompt = enrichedPrompt;
    } else if (priority === 'lyrics_fidelity') {
      const userDesc = (original_description || prompt || '').toString().trim();
      const trimmedDesc = userDesc.length > 250 ? userDesc.slice(0, 250) : userDesc;
      lyricsAwarePrompt = `STYLE:\n${trimmedDesc}\nclear Spanish pronunciation, neutral accent, intelligible vocals\n\nLYRICS:\n${lyrics.trim()}`;
    } else {
      const userDesc = (original_description || prompt || '').toString().trim();
      lyricsAwarePrompt = `CREATIVE DIRECTION:\n${userDesc}\n\nLYRICS:\n${lyrics.trim()}`;
    }

    console.log(`[GENERATE-AUDIO] priority=${priority} | promptMode=${promptMode} | finalPromptLen=${lyricsAwarePrompt.length}`);

    // ── Generate ──
    let audioBuffer: ArrayBuffer | null = null;
    let durationSecs: number = 0;
    let songMap: string | null = null;
    let actualProvider = provider;

    // ── KIE Suno branch (delegates to kie-suno-generate; async via callback) ──
    if (useKie) {
      try {
        const kiePayload = {
          prompt: lyricsAwarePrompt,
          instrumental: mode !== 'song',
          customMode: true,
          ...(genre || mood ? { style: [genre, mood].filter(Boolean).join(', ') } : {}),
        };
        const idemKey = crypto.randomUUID();
        const supaUrl = Deno.env.get('SUPABASE_URL')!;
        const dispatchRes = await fetch(`${supaUrl}/functions/v1/kie-suno-generate`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader!,
            'Content-Type': 'application/json',
            'x-idempotency-key': idemKey,
          },
          body: JSON.stringify(kiePayload),
        });
        const dispatchJson = await dispatchRes.json().catch(() => ({}));
        if (!dispatchRes.ok || dispatchJson?.error) {
          const msg = dispatchJson?.error || `kie_dispatch_${dispatchRes.status}`;
          console.warn(`[GENERATE-AUDIO] KIE dispatch failed: ${msg}`);
          if (msg === 'insufficient_credits') {
            return new Response(JSON.stringify(dispatchJson), {
              status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          // Try fallback if configured
          if (fallbackProvider === 'elevenlabs' || fallbackProvider === 'lyria') {
            console.log(`[GENERATE-AUDIO] Falling back to ${fallbackProvider}`);
            // KIE didn't debit (dispatch failed) — debit now for fallback
            const { data: prof } = await supabaseAdmin.from('profiles').select('available_credits').eq('user_id', userId).single();
            if (!prof || prof.available_credits < CREDITS_COST) {
              return new Response(JSON.stringify({ error: 'insufficient_credits', required: CREDITS_COST }), {
                status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            await supabaseAdmin.from('profiles').update({
              available_credits: prof.available_credits - CREDITS_COST,
              updated_at: new Date().toISOString(),
            }).eq('user_id', userId).eq('available_credits', prof.available_credits);
            await supabaseAdmin.from('credit_transactions').insert({
              user_id: userId, amount: -CREDITS_COST, type: 'usage',
              description: `Generación audio (fallback ${fallbackProvider}): ${prompt.slice(0, 80)}`,
            });
            actualProvider = fallbackProvider;
            // Fall through to lyria/elevenlabs below by reassigning flags
            // Re-execute via direct calls
            try {
              if (fallbackProvider === 'lyria' && lyriaCompatible) {
                const r = await generateWithLyria({ prompt: lyricsAwarePrompt, explicitDuration, geminiApiKey: GEMINI_API_KEY });
                audioBuffer = r.audioBuffer; durationSecs = r.durationSecs; songMap = r.songMap;
              } else {
                const r = await generateWithElevenLabs({ enrichedPrompt, lyricsAwarePrompt, hasLyrics, explicitDuration, apiKey: ELEVENLABS_API_KEY });
                audioBuffer = r.audioBuffer; durationSecs = r.durationSecs;
                actualProvider = 'elevenlabs';
              }
            } catch (fbErr) {
              const { data: p2 } = await supabaseAdmin.from('profiles').select('available_credits').eq('user_id', userId).single();
              if (p2) {
                await supabaseAdmin.from('profiles').update({
                  available_credits: p2.available_credits + CREDITS_COST,
                  updated_at: new Date().toISOString(),
                }).eq('user_id', userId);
                await supabaseAdmin.from('credit_transactions').insert({
                  user_id: userId, amount: CREDITS_COST, type: 'refund',
                  description: `Reembolso: KIE+fallback failed ${(fbErr as Error).message}`.slice(0, 200),
                });
              }
              return new Response(JSON.stringify({ error: 'provider_unavailable' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } else {
            return new Response(JSON.stringify({ error: 'provider_unavailable', details: msg }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } else {
          // KIE dispatch ok — async, return processing status to client
          actualProvider = 'kie_suno';
          console.log(`[GENERATE-AUDIO] KIE task dispatched: logId=${dispatchJson.logId} taskId=${dispatchJson.taskId}`);
          return new Response(JSON.stringify({
            status: 'processing',
            provider: 'kie_suno',
            logId: dispatchJson.logId,
            taskId: dispatchJson.taskId,
            idempotencyKey: idemKey,
            message: 'Generación en curso. La canción aparecerá en tu biblioteca al completarse.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (kieErr) {
        console.error('[GENERATE-AUDIO] KIE branch fatal:', kieErr);
        return new Response(JSON.stringify({ error: 'provider_unavailable', details: (kieErr as Error).message }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (!audioBuffer && useLyria) {
      try {
        const result = await generateWithLyria({
          prompt: lyricsAwarePrompt,
          explicitDuration,
          geminiApiKey: GEMINI_API_KEY,
        });
        audioBuffer = result.audioBuffer;
        durationSecs = result.durationSecs;
        songMap = result.songMap;
      } catch (lyriaErr) {
        // Fallback to ElevenLabs if Lyria fails
        console.warn(`[GENERATE-AUDIO] Lyria failed, falling back to ElevenLabs: ${(lyriaErr as Error).message}`);
        actualProvider = 'elevenlabs_fallback';
        try {
          const result = await generateWithElevenLabs({
            enrichedPrompt,
            lyricsAwarePrompt,
            hasLyrics,
            explicitDuration,
            apiKey: ELEVENLABS_API_KEY,
          });
          audioBuffer = result.audioBuffer;
          durationSecs = result.durationSecs;
        } catch (elErr) {
          await refundCredits(`Lyria + EL fallback failed: ${(elErr as Error).message}`);
          return new Response(
            JSON.stringify({ error: 'provider_unavailable', details: 'Both providers failed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (!audioBuffer) {
      // ElevenLabs path (lyrics present OR duration > 180s)
      try {
        const result = await generateWithElevenLabs({
          enrichedPrompt,
          lyricsAwarePrompt,
          hasLyrics,
          explicitDuration,
          apiKey: ELEVENLABS_API_KEY,
        });
        audioBuffer = result.audioBuffer;
        durationSecs = result.durationSecs;
      } catch (elErr) {
        const errMsg = (elErr as Error).message;
        await refundCredits(`EL error: ${errMsg}`);
        if (errMsg.includes('429') || errMsg.includes('rate')) {
          return new Response(JSON.stringify({ error: 'provider_rate_limit' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'provider_unavailable' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ── Persist to Supabase Storage ──
    const audioBytes = new Uint8Array(audioBuffer!);
    const base64Audio = base64Encode(audioBuffer!);
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
          prompt: prompt.slice(0, 2500),
          audio_url: savedAudioUrl,
          duration: durationSecs!,
          genre: genre || null,
          mood: mood || null,
        }).select('id').single();
        generationId = gen?.id || null;
        console.log(`[GENERATE-AUDIO] Saved: ${generationId} (${durationSecs}s) provider=${actualProvider}`);
      } else {
        console.error('[GENERATE-AUDIO] Upload error:', uploadError);
      }
    } catch (persistErr) {
      console.error('[GENERATE-AUDIO] Persist error (non-fatal):', persistErr);
    }

    // ── Log generation (ai_generation_logs) ──
    try {
      await supabaseAdmin.from('ai_generation_logs').insert({
        user_id: userId,
        feature_key: featureKey,
        provider: actualProvider,
        model: actualProvider.startsWith('lyria') ? (activeSetting?.model || 'lyria-3-pro-preview') : (activeSetting?.model || 'eleven_music_v1'),
        estimated_cost_usd: activeSetting?.cost_usd_estimate ?? null,
        status: 'completed',
        request_payload: {
          original_description: original_description ?? prompt,
          original_lyrics: original_lyrics ?? (hasLyrics ? lyrics : ''),
          generation_priority: priority,
          final_prompt_enviado: lyricsAwarePrompt,
          mode: promptMode,
          duration: explicitDuration,
        },
        response_payload: { duration: durationSecs, generationId },
        output_url: savedAudioUrl,
        user_credits_charged: CREDITS_COST,
      });
    } catch (logErr) {
      console.error('[GENERATE-AUDIO] Log insert (non-fatal):', logErr);
    }

    return new Response(
      JSON.stringify({
        audio: base64Audio,
        format: 'audio/mpeg',
        duration: durationSecs!,
        provider: actualProvider,
        status: 'completed',
        generationId,
        audioUrl: savedAudioUrl,
        lyricsUsed: hasLyrics,
        songMap,                    // Lyria song map — null when EL was used
        usedCompositionPlan: !useLyria && hasLyrics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-AUDIO] Fatal error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
