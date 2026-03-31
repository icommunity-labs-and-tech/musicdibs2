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

    // Fetch work + AI generation + default artist profile metadata
    const [workRes, genRes, profileRes] = await Promise.all([
      supabase.from('works').select('title, author, description, type')
        .eq('id', promo.work_id).eq('user_id', user.id).single(),
      supabase.from('ai_generations').select('prompt, genre, mood')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('user_artist_profiles').select('name')
        .eq('user_id', user.id).eq('is_default', true).limit(1).maybeSingle(),
    ]);

    let work = workRes.data;
    if (!work) {
      // Try ai_generations if not found in works
      const aiGenDirect = await supabase.from('ai_generations').select('prompt, genre, mood')
        .eq('id', promo.work_id).eq('user_id', user.id).single();
      if (aiGenDirect.data) {
        work = {
          title: aiGenDirect.data.prompt || 'AI Song',
          author: profileRes.data?.name || null,
          description: [aiGenDirect.data.genre, aiGenDirect.data.mood].filter(Boolean).join(' · ') || null,
          type: 'audio',
        };
      }
    }

    if (!work) {
      return new Response(JSON.stringify({ error: 'Work not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use default artist profile name if work has no author
    if (!work.author && profileRes.data?.name) {
      work.author = profileRes.data.name;
    }

    const aiGen = genRes.data?.find((g: any) =>
      work.title && g.prompt?.toLowerCase().includes(work.title.toLowerCase())
    ) || null;

    // Build enriched prompt
    const parts = [
      `Generate a promotional image for the song "${work.title}" by ${work.author || 'artist'}.`,
    ];
    if (aiGen?.genre) parts.push(`Genre: ${aiGen.genre}.`);
    if (aiGen?.mood) parts.push(`Mood: ${aiGen.mood}.`);
    if (work.type) parts.push(`Type: ${work.type}.`);
    if (work.description) parts.push(`Context: ${work.description.slice(0, 100)}.`);
    if (aiGen?.prompt) parts.push(`Original AI concept: ${aiGen.prompt.slice(0, 120)}.`);
    parts.push('Create a striking square 1080x1080 promotional artwork with a dark purple and violet gradient background, gold accents, and modern minimalist design. Include the song title as text overlay. High quality, professional. Unique variation.');

    const IMAGE_MODELS = [
      'google/gemini-3.1-flash-image-preview',
      'google/gemini-3-pro-image-preview',
      'google/gemini-2.5-flash-image',
    ];

    // Mark as regenerating
    await supabase.from('social_promotions').update({
      status: 'generating',
      regeneration_count: promo.regeneration_count + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', promo_id);

    const responseData = { promo_id, status: 'generating', regeneration_count: promo.regeneration_count + 1 };

    // Background: regenerate image with model fallback
    (async () => {
      try {
        let imageUrl = '';
        const prompt = parts.join(' ');

        for (const model of IMAGE_MODELS) {
          console.log(`[PROMO-REGEN-IMG] Trying model: ${model}`);
          try {
            const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                modalities: ['image', 'text'],
              }),
            });

            if (!res.ok) {
              console.error(`[PROMO-REGEN-IMG] Model ${model} error ${res.status}:`, await res.text());
              continue;
            }

            const data = await res.json();
            const base64Image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

            if (base64Image?.startsWith('data:image')) {
              const base64Data = base64Image.split(',')[1];
              const imgBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const fileName = `${promo_id}_${Date.now()}.png`;

              const { error: uploadError } = await supabase.storage
                .from('social-promo-images')
                .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true });

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('social-promo-images')
                  .getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
              }
              console.log(`[PROMO-REGEN-IMG] Image generated with ${model}`);
              break;
            } else {
              console.warn(`[PROMO-REGEN-IMG] Model ${model} returned no image`);
            }
          } catch (modelErr: any) {
            console.error(`[PROMO-REGEN-IMG] Model ${model} exception:`, modelErr.message);
          }
        }

        await supabase.from('social_promotions').update({
          image_url: imageUrl || null,
          status: 'assets_ready',
          updated_at: new Date().toISOString(),
        }).eq('id', promo_id);

        console.log(`[PROMO-REGEN-IMG] Completed for promo ${promo_id}, hasImage: ${!!imageUrl}`);
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
