import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FREE_REGENERATIONS = 3;
const REGEN_CREDIT_COST = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { promo_id, paid } = await req.json();
    if (!promo_id) {
      return new Response(JSON.stringify({ error: 'promo_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: promo } = await supabase
      .from('social_promotions')
      .select('id, work_id, status, regeneration_count')
      .eq('id', promo_id)
      .eq('user_id', user.id)
      .single();

    if (!promo) {
      return new Response(JSON.stringify({ error: 'Promotion not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (promo.status === 'generating') {
      return new Response(JSON.stringify({ error: 'Promotion is still generating' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check regeneration limit
    const isFree = promo.regeneration_count < MAX_FREE_REGENERATIONS;

    if (!isFree) {
      if (!paid) {
        return new Response(JSON.stringify({ error: 'regeneration_limit_reached', remaining: 0 }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('available_credits')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.available_credits < REGEN_CREDIT_COST) {
        return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('profiles').update({
        available_credits: profile.available_credits - REGEN_CREDIT_COST,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -REGEN_CREDIT_COST,
        type: 'usage',
        description: `Regeneración imagen (pagada)`,
      });
    }

    const { data: work } = await supabase
      .from('works')
      .select('title, author, type, description, blockchain_hash, blockchain_network, certified_at')
      .eq('id', promo.work_id)
      .eq('user_id', user.id)
      .single();

    if (!work) {
      return new Response(JSON.stringify({ error: 'Work not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch AI generation metadata if available
    const { data: aiGen } = await supabase
      .from('ai_generations')
      .select('prompt, genre, mood')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const titleLower = work.title.toLowerCase();
    const matchingGen = aiGen?.find((g: any) =>
      g.prompt?.toLowerCase().includes(titleLower) ||
      titleLower.includes(g.prompt?.toLowerCase()?.slice(0, 20) || '___')
    ) || null;

    const { data: artistProfile } = await supabase
      .from('user_artist_profiles')
      .select('genre, mood, style_notes')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    const genre = matchingGen?.genre || artistProfile?.genre || '';
    const mood = matchingGen?.mood || artistProfile?.mood || '';
    const aiPrompt = matchingGen?.prompt || '';
    const isCertified = !!work.certified_at;

    // Mark as regenerating and increment count
    await supabase.from('social_promotions').update({
      status: 'generating',
      regeneration_count: promo.regeneration_count + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', promo_id);

    const responseData = { promo_id, status: 'generating', regeneration_count: promo.regeneration_count + 1 };

    // Background: regenerate image with Nano Banana 2
    (async () => {
      try {
        const imagePromptParts = [
          `Create a unique, visually stunning music promotion poster for "${work.title}"`,
          work.author ? `by "${work.author}"` : '',
          genre ? `Genre: ${genre}.` : '',
          mood ? `Mood: ${mood}.` : '',
          work.description ? `Song description: ${work.description}.` : '',
          aiPrompt ? `Musical concept: ${aiPrompt}.` : '',
          `Style: Modern, high-contrast, cinematic music artwork. NEW UNIQUE VARIATION.`,
          genre?.toLowerCase().includes('reggae') || genre?.toLowerCase().includes('urban')
            ? 'Urban aesthetic, neon lights, street vibes.'
            : genre?.toLowerCase().includes('electr')
            ? 'Futuristic, synth wave, digital aesthetic.'
            : genre?.toLowerCase().includes('rock')
            ? 'Dark, edgy, concert stage lighting.'
            : genre?.toLowerCase().includes('indie')
            ? 'Warm tones, vintage film grain, poetic.'
            : 'Abstract musical waves, dark purple gradient, gold accents.',
          `Square format 1:1. No text. Professional album cover art style.`,
          isCertified ? 'Include a subtle golden certified seal element.' : '',
        ].filter(Boolean).join(' ');

        const imageRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image-preview',
            messages: [{ role: 'user', content: imagePromptParts }],
            modalities: ['image', 'text'],
          }),
        });

        let imageUrl = '';

        if (imageRes.ok) {
          const imageData = await imageRes.json();
          const base64Url = imageData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (base64Url && base64Url.startsWith('data:image/')) {
            const base64Data = base64Url.split(',')[1];
            const binaryString = atob(base64Data);
            const imgBuffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              imgBuffer[i] = binaryString.charCodeAt(i);
            }

            const fileName = `${promo_id}_${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
              .from('social-promo-images')
              .upload(fileName, imgBuffer, {
                contentType: 'image/png',
                upsert: true,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('social-promo-images')
                .getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
            }
          }
        } else {
          console.error('[PROMO-REGEN-IMG] Image gen failed:', imageRes.status);
        }

        await supabase.from('social_promotions').update({
          image_url: imageUrl || null,
          status: 'assets_ready',
          updated_at: new Date().toISOString(),
        }).eq('id', promo_id);

        console.log(`[PROMO-REGEN-IMG] Image regenerated for promo ${promo_id}`);
      } catch (bgError: any) {
        console.error('[PROMO-REGEN-IMG] Error:', bgError);
        await supabase.from('social_promotions').update({
          status: 'assets_ready',
          error_detail: `Image regen failed: ${bgError.message}`,
          updated_at: new Date().toISOString(),
        }).eq('id', promo_id);
      }
    })();

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[PROMO-REGEN-IMG] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});