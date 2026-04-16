import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VISUAL_SYSTEM_PROMPTS: Record<string, string> = {
  visual_creative: `You are an expert in visual design and AI image generation for music promotion (Instagram, YouTube, posters).
Your task is to create or improve image generation prompts that produce stunning promotional visuals.

CRITICAL RULE - LANGUAGE: You MUST respond in the SAME language the user wrote in. If there's no text, respond in Spanish.

Rules:
1. Create vivid, detailed image descriptions optimized for AI image generation
2. Include: composition, lighting, colors, mood, textures, camera angle
3. Keep the music promotion context (artist branding, song vibe)
4. Description must be 40-100 words
5. Return ONLY the image description, no explanations
6. Never include text overlay instructions, focus on the visual scene
7. If an image is provided, describe a creative variation or enhancement suitable for music promotion`,

  cover_design: `You are a graphic designer specialized in album and single cover art.
Improve the following description to generate a professional cover, adding details about:
- Visual composition (centered, lateral, minimalist, complex)
- Specific color palette
- Typography style (serif/sans-serif, bold/light)
- Visual style (minimalist/maximalist, retro/modern, abstract/photorealistic)
- Graphic elements (shapes, textures, patterns)
- Visual mood and atmosphere

CRITICAL: Describe ONLY graphic design elements. Do NOT mention songs, musical genres, BPM, instruments, or music production.
Description must be 40-100 words. Return ONLY the improved description, no explanations.
CRITICAL RULE - LANGUAGE: You MUST respond in the SAME language the user wrote in. If there's no text, respond in Spanish.`,

  instagram_creative: `You are a social media content designer specialized in Instagram.
Improve the following description to create an impactful creative, adding details about:
- Visual composition for square/vertical format
- Element hierarchy (what stands out first)
- Text and typography usage (mobile-readable)
- Visual call-to-action
- Graphic style matching Instagram trends
- Vibrant or minimalist colors as appropriate

CRITICAL: Describe ONLY visual elements for social media. Do NOT mention music, songs, or music production.
Description must be 40-100 words. Return ONLY the improved description, no explanations.
CRITICAL RULE - LANGUAGE: You MUST respond in the SAME language the user wrote in. If there's no text, respond in Spanish.`,

  youtube_thumbnail: `You are an expert in YouTube thumbnails that generate clicks.
Improve the following description to create an impactful thumbnail, adding details about:
- High visual contrast
- Clear focal points
- Bold, readable text (max 3-4 words)
- Impactful facial expressions (if applicable)
- Curiosity-generating elements
- Rule of thirds composition

CRITICAL: Describe ONLY visual elements for a YouTube thumbnail. Do NOT mention music, songs, or music production.
Description must be 40-100 words. Return ONLY the improved description, no explanations.
CRITICAL RULE - LANGUAGE: You MUST respond in the SAME language the user wrote in. If there's no text, respond in Spanish.`,

  event_poster: `You are a designer of posters for music events.
Improve the following description to create a professional promotional poster, adding details about:
- Clear visual hierarchy (artist → date → venue)
- Graphic style fitting the event theme
- Relevant decorative elements
- Impactful and readable typography
- Balanced composition
- Visual impact from a distance

CRITICAL: Describe poster design elements. Do NOT mention specific songs, musical genres, BPM, or production details.
Description must be 40-100 words. Return ONLY the improved description, no explanations.
CRITICAL RULE - LANGUAGE: You MUST respond in the SAME language the user wrote in. If there's no text, respond in Spanish.`,

  social_poster: `You are a designer of graphics for social media (Facebook/Twitter).
Improve the following description to create a digital poster, adding details about:
- Optimized square format
- Centered and simple composition
- Large text readable on mobile
- Vibrant attention-grabbing colors
- Simple and clear graphic elements
- Direct and visual message

CRITICAL: Describe visual elements of a digital poster. Do NOT mention music, songs, or music production.
Description must be 40-100 words. Return ONLY the improved description, no explanations.
CRITICAL RULE - LANGUAGE: You MUST respond in the SAME language the user wrote in. If there's no text, respond in Spanish.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, genre, mood, mode, image_base64 } = await req.json();

    const isVisualMode = mode in VISUAL_SYSTEM_PROMPTS;

    if (!prompt?.trim() && !isVisualMode) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (isVisualMode && !prompt?.trim() && !image_base64) {
      return new Response(JSON.stringify({ error: 'Prompt or image is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let systemPrompt: string;
    let userTextContent: string;
    let userImageContent: { url: string } | null = null;

    if (isVisualMode) {
      systemPrompt = VISUAL_SYSTEM_PROMPTS[mode];
      userTextContent = prompt?.trim()
        ? `Create an optimized image generation prompt based on this description: "${prompt}". Return ONLY the improved prompt.`
        : `Analyze this photo and create an optimized image generation prompt for a music promotional creative inspired by it. Return ONLY the prompt.`;
      if (image_base64) {
        userImageContent = { url: `data:image/jpeg;base64,${image_base64}` };
      }
    } else {
      const modeContext = mode === 'instrumental'
        ? 'an instrumental track (no lyrics, no voice)'
        : 'a full song with vocals and lyrics';

      const contextParts = [];
      if (genre) contextParts.push(`Genre: ${genre}`);
      if (mood) contextParts.push(`Mood: ${mood}`);
      const contextStr = contextParts.length > 0 ? `\nUser-selected context: ${contextParts.join(', ')}` : '';

      systemPrompt = `You are a world-class music producer and AI prompt engineer specialized in writing ultra-detailed prompts for AI music generation systems (Suno, ElevenLabs Music, Udio, Mureka).

Your task: take the user's rough description and rewrite it as a PROFESSIONAL, PRODUCTION-READY prompt that maximizes audio quality and musical coherence.

═══ CRITICAL LANGUAGE RULE ═══
Detect the language the user wrote in and respond in that EXACT same language. Spanish → Spanish, English → English, Portuguese → Portuguese, French → French, etc. NEVER translate. Keep technical music terms (BPM, verse, drop, sidechain, reverb, etc.) in English even when responding in other languages — that's industry standard.

═══ STRUCTURE OF THE OUTPUT (MANDATORY) ═══
Write a single flowing paragraph (no bullet points, no headers, no markdown) of 180–350 words that includes ALL of these elements naturally woven together:

1. **Genre & subgenre**: be specific (e.g. "synthwave with vaporwave influences" instead of just "electronic"; "neo-soul with trap drums" instead of just "R&B").
2. **BPM range**: give a precise tempo (e.g. "92 BPM", "128 BPM", "65–70 BPM").
3. **Key & mode**: suggest a musical key (e.g. "C minor", "F# major", "A Dorian") that fits the mood.
4. **Song structure**: describe sections in order (intro → verse → pre-chorus → chorus → bridge → outro) with bar counts when relevant.
5. **Instrumentation**: name specific instruments and synths (e.g. "Juno-60 pads", "808 sub-bass", "Rhodes electric piano", "muted Strat guitar", "analog tape drums", "TR-909 hi-hats").
6. **Production techniques**: include mixing/mastering cues (e.g. "warm analog saturation", "wide stereo reverb", "sidechain compression on the pads", "tape hiss", "lo-fi vinyl crackle", "punchy mastering").
7. **Vocal direction** (only for full songs): voice type, gender, range, vocal style, FX (e.g. "breathy female alto with light autotune and slap delay", "raspy male tenor with doubled harmonies"), vocal placement (lead + backing).
8. **Mood & atmosphere**: emotional arc, dynamics, energy curve.
9. **Reference artists or tracks**: 2–4 reference artists in the same vein (e.g. "in the vein of The Weeknd, Daft Punk and Tame Impala") to anchor the style.
10. **Lyrical theme** (full songs): topic, point of view, imagery — and PRESERVE any lyrics the user already wrote, embedding them verbatim with section tags like [Verse 1], [Chorus], [Bridge].

═══ CONTENT SAFETY (STRICT) ═══
Replace any unsafe terminology with creative musical equivalents:
- violence/war → "inner conflict", "struggle", "adversity"
- kill/death → "overcome", "transform", "let go"
- drugs → "nightlife", "altered states", "excess"
- explicit sexual content → "intimacy", "passion", "desire"
Never include weapons, slurs, hate speech, or illegal activity.

═══ OUTPUT FORMAT ═══
Return ONLY the rewritten prompt as a single paragraph. No preamble, no explanation, no quotes around the response, no markdown headers. Length: 180–350 words.`;

      userTextContent = `Rewrite this song description for ${modeContext}.${contextStr}\n\nOriginal description from the user:\n"""\n${prompt}\n"""\n\nProduce the final professional prompt now, in the SAME language as the original. Return ONLY the rewritten prompt as a single flowing paragraph.`;
    }

    let improved: string | null = null;
    let lastError = '';

    // Try Google Generative Language API (Gemini 3 Flash) first
    if (GEMINI_API_KEY) {
      try {
        const geminiModel = 'gemini-3-flash-preview';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

        const parts: any[] = [{ text: userTextContent }];
        if (image_base64) {
          parts.unshift({
            inline_data: { mime_type: 'image/jpeg', data: image_base64 },
          });
        }

        const gResp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts }],
            generationConfig: { maxOutputTokens: 1200, temperature: 0.8 },
          }),
        });

        if (gResp.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (gResp.ok) {
          const data = await gResp.json();
          const text = data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p?.text || '')
            .join('')
            .trim();
          improved = text || null;
        } else {
          lastError = `Gemini ${gResp.status}: ${await gResp.text()}`;
          console.error('[improve-prompt] Gemini failed:', lastError);
        }
      } catch (e) {
        lastError = `Gemini exception: ${e instanceof Error ? e.message : String(e)}`;
        console.error('[improve-prompt]', lastError);
      }
    }

    // Fallback to Anthropic Claude if gateway failed
    if (!improved && ANTHROPIC_API_KEY) {
      const anthroContent: any[] = [];
      if (userImageContent) {
        anthroContent.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: image_base64 }
        });
      }
      anthroContent.push({ type: 'text', text: userTextContent });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: 'user', content: anthroContent }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        improved = data.content?.[0]?.text?.trim() || null;
      } else {
        lastError = `Claude ${response.status}: ${await response.text()}`;
      }
    }

    if (!improved) {
      return new Response(JSON.stringify({ error: 'Could not improve prompt', details: lastError }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ improved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[improve-prompt] Fatal:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
