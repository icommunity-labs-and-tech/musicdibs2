import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
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

    // Auth
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
      artist_name,
      track_title,
      format,
      visual_style,
      image_description,
      base_photo_base64,
      copy_tone,
      cta,
    } = await req.json();

    if (!artist_name || !track_title || !format || !image_description) {
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
      type: 'instagram_creative',
      description: `Instagram ${format}: ${artist_name} - ${track_title}`,
    });

    try {
      // Generate image
      const imagePrompt = buildImagePrompt(artist_name, track_title, visual_style, image_description, format);
      const imageUrl = await generateImage(imagePrompt, base_photo_base64, format);

      // Generate copy + hashtags
      const { copy, hashtags } = await generateCopyAndHashtags(
        artist_name, track_title, copy_tone, cta, format
      );

      return new Response(
        JSON.stringify({
          success: true,
          image_url: imageUrl,
          copy,
          hashtags,
          credits_used: creditsNeeded,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (genError) {
      // Refund credits on failure
      console.error('Generation failed, refunding credits:', genError);
      await supabaseAdmin
        .from('profiles')
        .update({ available_credits: profile.available_credits })
        .eq('user_id', user.id);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id,
        amount: creditsNeeded,
        type: 'refund',
        description: `Refund: Instagram ${format} generation failed`,
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

function buildImagePrompt(
  artistName: string,
  trackTitle: string,
  visualStyle: string,
  description: string,
  format: string
): string {
  const styleDescriptions: Record<string, string> = {
    minimalist: 'minimalist design, clean and simple, lots of negative space',
    vibrant: 'vibrant colors, energetic, eye-catching, saturated',
    elegant: 'elegant and sophisticated, refined aesthetic, luxury feel',
    urban: 'urban style, street culture, contemporary, graffiti-inspired',
    retro: 'retro aesthetic, vintage vibes, nostalgic, film grain',
    neon: 'neon lights, cyberpunk aesthetic, futuristic glow, dark background',
  };

  const formatDesc: Record<string, string> = {
    feed: 'square format 1:1 Instagram feed post',
    story: 'vertical format 9:16 Instagram story',
  };

  let prompt = `Professional Instagram ${format} image for music promotion. `;
  prompt += `${formatDesc[format] || 'square format'}. `;
  prompt += `${styleDescriptions[visualStyle] || visualStyle}. `;
  prompt += `${description}. `;
  prompt += `Artist: "${artistName}", Track: "${trackTitle}". `;
  prompt += `High quality, visually striking, optimized for Instagram engagement, no watermarks, professional photography or illustration quality.`;

  return prompt;
}

async function generateImage(
  prompt: string,
  basePhotoBase64: string | null,
  format: string
): Promise<string> {
  const imageSize = format === 'feed' ? 'square_hd' : { width: 720, height: 1280 };

  const falRequest: Record<string, unknown> = {
    prompt,
    image_size: imageSize,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
  };

  let endpoint: string;

  if (basePhotoBase64) {
    const dataUrl = `data:image/jpeg;base64,${basePhotoBase64}`;
    falRequest.image_url = dataUrl;
    falRequest.strength = 0.55;
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

async function generateCopyAndHashtags(
  artistName: string,
  trackTitle: string,
  tone: string,
  cta: string,
  format: string
): Promise<{ copy: string; hashtags: string[] }> {
  const toneDescriptions: Record<string, string> = {
    exciting: 'exciting and energetic, use fire/rocket emojis',
    mysterious: 'mysterious and intriguing, use moon/star emojis',
    fun: 'fun and playful, use party/music emojis',
    inspiring: 'inspiring and uplifting, use sparkle/heart emojis',
    casual: 'casual and friendly, use chill emojis',
    professional: 'professional and polished, use minimal emojis',
  };

  const ctaTexts: Record<string, string> = {
    listen_now: '🎧 Escúchala ahora / Listen now',
    out_now: '🔥 Ya disponible / Out now',
    new_single: '✨ Nuevo single / New single',
    coming_soon: '⏳ Próximamente / Coming soon',
    link_in_bio: '🔗 Link en bio / Link in bio',
  };

  const formatContext =
    format === 'story'
      ? 'This is for an Instagram story — keep it very brief, 1-2 lines max.'
      : 'This is for an Instagram feed post — 2-3 lines with good engagement hooks.';

  const promptText = `Generate Instagram post copy and hashtags for promoting a song.

Artist: ${artistName}
Track: "${trackTitle}"
Tone: ${toneDescriptions[tone] || tone}
Call to action: ${ctaTexts[cta] || cta}
Format: ${formatContext}

Return ONLY a JSON object with this exact structure, no extra text:
{
  "copy": "The post text (2-3 lines, include emojis naturally, end with the CTA)",
  "hashtags": ["hashtag1", "hashtag2"] (10-15 relevant hashtags WITHOUT # symbol)
}

Make the copy compelling and authentic. Include the artist name and track title naturally.`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      max_tokens: 1000,
      messages: [{ role: 'user', content: promptText }],
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error('AI gateway error:', errText);
    throw new Error('AI gateway error');
  }

  const aiData = await aiResponse.json();
  const responseText = aiData.choices?.[0]?.message?.content || '';

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to parse AI response:', responseText);
    // Return fallback
    return {
      copy: `🎵 ${artistName} — "${trackTitle}" 🔥\n\n${ctaTexts[cta] || '🎧 Listen now'}`,
      hashtags: ['newmusic', 'music', artistName.replace(/\s/g, '').toLowerCase(), 'spotify', 'applemusic'],
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    copy: parsed.copy || '',
    hashtags: parsed.hashtags || [],
  };
}
