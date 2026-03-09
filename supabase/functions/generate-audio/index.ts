import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
    
    if (!STABILITY_API_KEY) {
      console.error('[GENERATE-AUDIO] Missing STABILITY_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, duration, cfgScale = 7 } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clamp duration to Stable Audio limits (5-180 seconds)
    const clampedDuration = Math.max(5, Math.min(180, duration || 30));

    console.log(`[GENERATE-AUDIO] Generating: "${prompt.substring(0, 50)}..." | ${clampedDuration}s | cfg: ${cfgScale}`);

    const STABILITY_API_URL = 'https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio';

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('duration', String(clampedDuration));
    formData.append('cfg_scale', String(cfgScale));
    formData.append('steps', '50');
    formData.append('output_format', 'mp3');

    const response = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GENERATE-AUDIO] Stability API error: ${response.status} - ${errorText}`);
      
      // Handle credit exhaustion specifically
      if (response.status === 402 || errorText.toLowerCase().includes('credits')) {
        return new Response(
          JSON.stringify({ 
            error: 'insufficient_credits',
            message: 'Sin créditos disponibles',
            details: 'Tu cuenta de Stability AI no tiene créditos suficientes. Por favor, recarga créditos en platform.stability.ai para continuar generando audio.'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await response.json();

    if (!payload?.audio) {
      console.error('[GENERATE-AUDIO] Invalid response payload:', payload);
      return new Response(
        JSON.stringify({ error: 'Generation failed: invalid audio response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GENERATE-AUDIO] Success! Received base64 audio (${payload.audio.length} chars)`);

    return new Response(
      JSON.stringify({ 
        audio: payload.audio,
        format: 'audio/mpeg',
        duration: clampedDuration,
        seed: payload.seed ?? null,
        finish_reason: payload.finish_reason ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Get the audio as an ArrayBuffer and convert to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    console.log(`[GENERATE-AUDIO] Success! Audio size: ${audioBuffer.byteLength} bytes`);

    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        format: 'audio/mpeg',
        duration: clampedDuration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-AUDIO] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
