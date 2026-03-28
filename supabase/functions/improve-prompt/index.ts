import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { prompt, genre, mood, mode } = await req.json();

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const modeContext = mode === 'instrumental'
      ? 'an instrumental track (no lyrics, no voice)'
      : 'a full song with voice and lyrics';

    const contextParts = [];
    if (genre) contextParts.push(`Genre: ${genre}`);
    if (mood) contextParts.push(`Mood: ${mood}`);
    const contextStr = contextParts.length > 0 ? `\nAdditional context: ${contextParts.join(', ')}` : '';

    const systemPrompt = `You are an expert in music production and AI music generation systems.
Your task is to improve and optimize song descriptions to get the best results from music generation APIs like ElevenLabs.

Strict rules:
1. Fix spelling and grammar errors
2. Expand vague descriptions with specific musical details (tempo, instruments, structure, energy, BPM range)
3. NEVER use words related to explicit violence, war, weapons, death, illegal drugs, sexual content
4. Replace problematic terms with valid musical equivalents:
   - "war" / "guerra" -> "inner conflict", "struggle", "adversity"
   - "kill" / "matar" -> "overcome", "conquer"
   - "drugs" / "drogas" -> "excesses", "nightlife"
5. Keep the original spirit and style the user intended
6. Always write in English for best results with music APIs
7. Description must be between 50-150 words
8. Format: return ONLY the improved description, no explanations or additional comments
9. Include elements like: music genre, subgenre, key instruments, tempo/energy, atmosphere, style references`;

    const userMessage = `Improve this description for ${modeContext}:${contextStr}\n\nOriginal description: "${prompt}"\n\nReturn ONLY the improved description in English, ready to use in the music generation API.`;

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
        messages: [{ role: 'user', content: userMessage }],
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
