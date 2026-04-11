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

    const systemPrompt = `Eres un experto en producción musical y descripción de canciones para APIs de generación de música como ElevenLabs Music API. Tu trabajo es mejorar descripciones de canciones haciéndolas más específicas y detalladas.`;

    const userPrompt = `Mejora esta descripción de canción para ElevenLabs Music API. Hazla más específica añadiendo:
- Instrumentación detallada (guitarra, piano, batería, bajo, sintetizadores, etc)
- Tipo de voz (femenina/masculina, tono, edad aproximada)
- Ritmo y tempo (lento, medio, rápido, uptempo, downtempo)
- Mood/atmósfera (alegre, melancólico, energético, relajado, etc)
- Estructura musical si es relevante

Mantén el género y estilo original. No inventes información que no esté implícita. Devuelve SOLO la descripción mejorada, sin explicaciones.

Original: ${text}

Mejorada:`;

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
    const improved = data.content?.[0]?.text?.trim() || '';

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
