import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || text.length < 10) {
      return new Response(JSON.stringify({ error: 'Text too short' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert music producer and song description specialist. Your job is to improve song descriptions making them more specific and detailed. CRITICAL RULE: You MUST respond in the EXACT SAME LANGUAGE as the user's input text. If the input is in Spanish, respond in Spanish. If the input is in English, respond in English. Match the language precisely.`;

    const userPrompt = `Improve this song description to make it more specific and detailed.

CRITICAL: Respond in the SAME LANGUAGE as the original text below.
- If the text is in Spanish → respond entirely in Spanish
- If the text is in English → respond entirely in English
- If the text is in another language → respond in that language

Add details about:
- Specific instrumentation (guitar, piano, drums, synths, bass, etc)
- Voice type and vocal characteristics (female/male, tone, age)
- Tempo and rhythm (slow, medium, fast, uptempo, BPM if relevant)
- Mood and emotional atmosphere
- Production elements

Keep the original musical genre and style. Do not invent information not implied in the original.

Return ONLY the improved description, no explanations, no prefixes, no quotes.

Original text:
${text}`;


    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[IMPROVE-DESC] Anthropic error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: response.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const improved = (data.content?.[0]?.text?.trim() || '')
      .replace(/^(Descripción mejorada:|Improved description:|Descripción:|Description:)\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    if (!improved) {
      return new Response(JSON.stringify({ error: 'Empty response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Truncate to 2000 chars if needed
    const finalText = improved.length > 2000 ? improved.slice(0, 1997) + '...' : improved;

    return new Response(JSON.stringify({ improved_text: finalText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[IMPROVE-DESC] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
