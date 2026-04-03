import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const FAL_API_KEY = Deno.env.get('FAL_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { artist_name, event_title, event_date, venue, time, format, visual_style, additional_info, logo_base64, photo_base64 } = await req.json();

    if (!artist_name || !event_title || !event_date || !venue || !format) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check credits
    const { data: profile } = await supabaseAdmin.from('profiles').select('available_credits').eq('user_id', user.id).single();
    if (!profile || profile.available_credits < 1) {
      return new Response(JSON.stringify({ error: 'Insufficient credits', needed: 1, current: profile?.available_credits || 0 }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Deduct credit upfront
    await supabaseAdmin.rpc('decrement_credits', { _user_id: user.id, _amount: 1 });
    await supabaseAdmin.from('credit_transactions').insert({ user_id: user.id, amount: -1, type: 'event_poster', description: `Event poster (${format}): ${artist_name} - ${event_title}` });

    const refundCredits = async () => {
      await supabaseAdmin.from('profiles').update({ available_credits: profile.available_credits }).eq('user_id', user.id);
      await supabaseAdmin.from('credit_transactions').insert({ user_id: user.id, amount: 1, type: 'refund', description: `Refund event poster: ${artist_name} - ${event_title}` });
    };

    try {
      const dimensions: Record<string, { w: number; h: number }> = {
        flyer: { w: 1748, h: 2480 },
        poster: { w: 2480, h: 3508 },
        poster_large: { w: 3508, h: 4961 },
      };
      const dim = dimensions[format] || dimensions.flyer;

      const styleMap: Record<string, string> = {
        minimalist: 'minimalist design, clean typography, lots of white space',
        vibrant: 'vibrant colors, energetic, bold typography, eye-catching',
        rock: 'rock concert aesthetic, grungy textures, bold dark colors, urban',
        electronic: 'electronic music aesthetic, neon colors, geometric patterns, futuristic',
        jazz: 'jazz elegant aesthetic, warm tones, sophisticated typography, classic',
        retro: 'retro vintage aesthetic, warm colors, old-school typography, nostalgic',
      };

      let prompt = `Professional event poster for a music concert. `;
      prompt += `Portrait format, ${format === 'flyer' ? 'A5 flyer' : format === 'poster' ? 'A4 poster' : 'A3 large poster'}. `;
      prompt += `${styleMap[visual_style] || visual_style}. `;
      prompt += `Artist/Band: "${artist_name}". `;
      prompt += `Event: "${event_title}". `;
      prompt += `Date: ${event_date}. `;
      prompt += `Venue: ${venue}. `;
      if (time) prompt += `Time: ${time}. `;
      if (additional_info) prompt += `Additional info: ${additional_info}. `;
      prompt += `Include all text information prominently. High quality, print-ready, no watermarks.`;

      const falRequest: any = {
        prompt,
        image_size: { width: Math.min(dim.w, 1440), height: Math.min(dim.h, 1440) },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
      };

      let endpoint = 'https://fal.run/fal-ai/flux-pro/v1.1';
      if (photo_base64) {
        endpoint = 'https://fal.run/fal-ai/flux/dev/image-to-image';
        falRequest.image_url = `data:image/jpeg;base64,${photo_base64}`;
        falRequest.strength = 0.4;
      }

      const falRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(falRequest),
      });

      if (!falRes.ok) {
        const errText = await falRes.text();
        console.error('fal.ai error:', errText);
        await refundCredits();
        return new Response(JSON.stringify({ error: 'Image generation failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const falData = await falRes.json();
      const imageUrl = falData.images[0].url;

      const imgRes = await fetch(imageUrl);
      const imgBuf = await imgRes.arrayBuffer();

      const fileName = `${user.id}/${Date.now()}_event_${format}.jpg`;
      const { error: uploadErr } = await supabaseAdmin.storage.from('event-posters').upload(fileName, imgBuf, { contentType: 'image/jpeg', upsert: false });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        await refundCredits();
        return new Response(JSON.stringify({ error: 'Failed to save poster' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, image_path: fileName, credits_used: 1 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err) {
      console.error('Generation error:', err);
      await refundCredits();
      return new Response(JSON.stringify({ error: 'Internal error', details: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
