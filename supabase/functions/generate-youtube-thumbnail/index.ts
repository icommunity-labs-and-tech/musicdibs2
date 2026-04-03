import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      video_title,
      visual_style,
      thumbnail_description,
      base_photo_base64,
      include_text,
      highlight_text,
    } = await req.json();

    if (!video_title || !thumbnail_description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check credits
    const creditsNeeded = 1;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('available_credits')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.available_credits < creditsNeeded) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient credits',
          needed: creditsNeeded,
          current: profile?.available_credits || 0,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits upfront
    await supabaseAdmin.rpc('decrement_credits', {
      _user_id: user.id,
      _amount: creditsNeeded,
    });

    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id,
      amount: -creditsNeeded,
      type: 'youtube_thumbnail',
      description: `YouTube thumbnail: ${video_title}`,
    });

    try {
      const imagePrompt = buildThumbnailPrompt(video_title, visual_style, thumbnail_description, include_text, highlight_text);
      const imageUrl = await generateThumbnail(imagePrompt, base_photo_base64);

      return new Response(
        JSON.stringify({
          success: true,
          image_url: imageUrl,
          credits_used: creditsNeeded,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (genError) {
      // Refund on failure
      console.error('Generation failed, refunding:', genError);
      await supabaseAdmin
        .from('profiles')
        .update({ available_credits: profile.available_credits })
        .eq('user_id', user.id);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id,
        amount: creditsNeeded,
        type: 'refund',
        description: `Refund: YouTube thumbnail generation failed`,
      });

      throw genError;
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildThumbnailPrompt(
  videoTitle: string,
  visualStyle: string,
  description: string,
  includeText: boolean,
  highlightText: string
): string {
  const styleDescriptions: Record<string, string> = {
    minimalist: 'minimalist design, clean and simple, professional',
    vibrant: 'vibrant colors, energetic, eye-catching, bold',
    clickbait: 'dramatic, attention-grabbing, high contrast, explosive colors, shocked expression',
    professional: 'professional and polished, clean, sophisticated',
    retro: 'retro aesthetic, vintage vibes, nostalgic',
    neon: 'neon lights, cyberpunk aesthetic, futuristic glow',
  };

  let prompt = `Professional YouTube thumbnail for music video. `;
  prompt += `Landscape format 16:9, 1280x720, optimized for YouTube. `;
  prompt += `${styleDescriptions[visualStyle] || visualStyle}. `;
  prompt += `${description}. `;
  prompt += `Video title: "${videoTitle}". `;

  if (includeText && highlightText) {
    prompt += `Include bold, easy-to-read text overlay: "${highlightText}". `;
    prompt += `Text should be large, impactful, and well-positioned. `;
  }

  prompt += `High quality, visually striking, optimized for YouTube thumbnail click-through rate, no watermarks.`;

  return prompt;
}

async function generateThumbnail(
  prompt: string,
  basePhotoBase64: string | null
): Promise<string> {
  const falRequest: Record<string, unknown> = {
    prompt,
    image_size: { width: 1280, height: 720 },
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
  };

  let endpoint: string;

  if (basePhotoBase64) {
    const dataUrl = `data:image/jpeg;base64,${basePhotoBase64}`;
    falRequest.image_url = dataUrl;
    falRequest.strength = 0.5;
    endpoint = 'https://fal.run/fal-ai/flux/dev/image-to-image';
  } else {
    endpoint = 'https://fal.run/fal-ai/flux-pro/v1.1';
  }

  const falResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(falRequest),
  });

  if (!falResponse.ok) {
    const errorText = await falResponse.text();
    console.error('fal.ai error:', errorText);
    throw new Error(`fal.ai error: ${falResponse.status}`);
  }

  const falData = await falResponse.json();
  return falData.images[0].url;
}
