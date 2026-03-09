import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RUNWAY_API_KEY = Deno.env.get('RUNWAY_API_KEY');
    if (!RUNWAY_API_KEY) {
      throw new Error('RUNWAY_API_KEY is not configured');
    }

    const { action, mode, promptText, promptImage, ratio, duration, taskId } = await req.json();

    const headers = {
      'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': RUNWAY_API_VERSION,
    };

    // Action: check task status
    if (action === 'status') {
      if (!taskId) throw new Error('taskId is required for status check');

      const response = await fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GENERATE-VIDEO] Runway status error: ${response.status} - ${errorText}`);
        throw new Error(`Runway API error: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: generate video
    if (action === 'generate') {
      if (!promptText) throw new Error('promptText is required');

      const endpoint = mode === 'image_to_video' ? 'image_to_video' : 'text_to_video';
      
      const body: Record<string, unknown> = {
        model: 'gen4_turbo',
        promptText,
        ratio: ratio || '1280:768',
        duration: duration || 5,
      };

      // For image-to-video, add the image
      if (mode === 'image_to_video' && promptImage) {
        body.promptImage = promptImage;
      }

      console.log(`[GENERATE-VIDEO] Starting ${endpoint}: "${promptText.slice(0, 60)}..." | ${duration}s | ratio: ${ratio}`);

      const response = await fetch(`${RUNWAY_API_URL}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GENERATE-VIDEO] Runway API error: ${response.status} - ${errorText}`);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait and try again.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Insufficient Runway credits. Please add credits at platform.stability.ai' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        throw new Error(`Runway API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[GENERATE-VIDEO] Task created: ${data.id}`);

      return new Response(JSON.stringify({ taskId: data.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[GENERATE-VIDEO] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
