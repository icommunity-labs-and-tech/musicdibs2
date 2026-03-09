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

    const STABILITY_API_URL = 'https://api.stability.ai/v2beta/audio/generate';

    const response = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/*',
      },
      body: JSON.stringify({
        prompt: prompt,
        duration: clampedDuration,
        cfg_scale: cfgScale,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GENERATE-AUDIO] Stability API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Generation failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
