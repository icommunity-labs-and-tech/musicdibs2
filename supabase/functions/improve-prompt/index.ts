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
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { prompt, genre, mood, mode, image_base64 } = await req.json();

    const isVisualMode = mode in VISUAL_SYSTEM_PROMPTS;

    // For visual modes, prompt can be empty if image is provided
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
    let userContent: any;

    if (isVisualMode) {
      systemPrompt = VISUAL_SYSTEM_PROMPTS[mode];

      const parts: any[] = [];

      if (image_base64) {
        parts.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: image_base64 }
        });
      }

      const textInstruction = prompt?.trim()
        ? `Create an optimized image generation prompt based on this description: "${prompt}". Return ONLY the improved prompt.`
        : `Analyze this photo and create an optimized image generation prompt for a music promotional creative inspired by it. Return ONLY the prompt.`;

      parts.push({ type: 'text', text: textInstruction });

      userContent = parts;
    } else {
      const modeContext = mode === 'instrumental'
        ? 'an instrumental track (no lyrics, no voice)'
        : 'a full song with voice and lyrics';

      const contextParts = [];
      if (genre) contextParts.push(`Genre: ${genre}`);
      if (mood) contextParts.push(`Mood: ${mood}`);
      const contextStr = contextParts.length > 0 ? `\nAdditional context: ${contextParts.join(', ')}` : '';

      systemPrompt = `You are an expert in music production and AI music generation systems.
Your task is to improve and optimize song descriptions to get the best results from music generation APIs like ElevenLabs.

CRITICAL RULE - LANGUAGE: You MUST respond in the SAME language the user wrote in.
- If the user wrote in Spanish -> respond in Spanish
- If the user wrote in English -> respond in English
- If the user wrote in French -> respond in French
- If the user wrote in any other language -> respond in that same language
NEVER translate the response to a different language than the input.

Other strict rules:
1. Fix spelling and grammar errors
2. Expand vague descriptions with specific musical details (tempo, instruments, structure, energy, BPM range)
3. NEVER use words related to explicit violence, war, weapons, death, illegal drugs, sexual content
4. Replace problematic terms with valid musical equivalents:
   - "war" / "guerra" -> "inner conflict" / "conflicto interior", "struggle" / "lucha", "adversity" / "adversidad"
   - "kill" / "matar" -> "overcome" / "superar", "conquer" / "vencer"
   - "drugs" / "drogas" -> "excesses" / "excesos", "nightlife" / "vida nocturna"
5. Keep the original spirit and style the user intended
6. Description must be between 50-150 words
7. Format: return ONLY the improved description, no explanations or additional comments
8. Include elements like: music genre, subgenre, key instruments, tempo/energy, atmosphere, style references`;

      userContent = `Improve this description for ${modeContext}:${contextStr}\n\nOriginal description: "${prompt}"\n\nIMPORTANT: Respond in the EXACT SAME LANGUAGE as the original description above. Return ONLY the improved description.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: 'Claude API error', details: err }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const improved = data.content?.[0]?.text?.trim();

    if (!improved) {
      return new Response(JSON.stringify({ error: 'No response from Claude' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ improved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
