import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { promo_id } = await req.json();
    if (!promo_id) {
      return new Response(JSON.stringify({ error: 'promo_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify promo belongs to user
    const { data: promo } = await supabase
      .from('social_promotions')
      .select('id, work_id, status')
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

    // Get work data
    const { data: work } = await supabase
      .from('works')
      .select('title, author, description, type, checker_url')
      .eq('id', promo.work_id)
      .eq('user_id', user.id)
      .single();

    if (!work) {
      return new Response(JSON.stringify({ error: 'Work not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as regenerating
    await supabase.from('social_promotions').update({
      status: 'generating',
      updated_at: new Date().toISOString(),
    }).eq('id', promo_id);

    // Respond immediately
    const responseData = { promo_id, status: 'generating' };

    // Background: regenerate copies only (no credits charged)
    (async () => {
      try {
        const workType = work.type || 'obra musical';

        const copiesRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 800,
            system: `Eres un experto en marketing musical y redes sociales. 
Genera copies virales y auténticos para promocionar obras musicales.
Responde SOLO con JSON válido, sin markdown ni explicaciones.`,
            messages: [{
              role: 'user',
              content: `Genera 3 copies NUEVOS y DIFERENTES para promocionar esta obra musical en redes sociales.
Sé creativo, usa un enfoque distinto al anterior.

Obra: "${work.title}"
Artista: "${work.author || 'Artista'}"
Tipo: ${workType}
Descripción: ${work.description || 'Sin descripción'}
${work.checker_url ? `Verificar en blockchain: ${work.checker_url}` : ''}

Genera exactamente este JSON:
{
  "ig_feed": "Copy para Instagram Feed (máx 150 chars, 2-3 emojis, 3-5 hashtags musicales relevantes, menciona que está certificado en blockchain)",
  "ig_story": "Copy para Instagram Story (máx 80 chars, directo, impactante, 1-2 emojis)",
  "tiktok": "Copy para TikTok (máx 150 chars, tono joven y viral, 3-5 hashtags trending de música)"
}

Idioma: español. Tono: auténtico, no corporativo.`
            }]
          })
        });

        let copies = { ig_feed: '', ig_story: '', tiktok: '' };

        if (copiesRes.ok) {
          const copiesData = await copiesRes.json();
          const text = copiesData.content?.[0]?.text?.trim();
          if (text) {
            try {
              copies = JSON.parse(text);
            } catch {
              copies = {
                ig_feed: `🎵 "${work.title}" de ${work.author || 'nuestro artista'} ya está disponible y certificado en blockchain. ¡Escúchalo ahora! #MusicDibs #Música #NuevaMusica`,
                ig_story: `🔥 "${work.title}" — certificado en blockchain ✅`,
                tiktok: `Nueva música de ${work.author || 'artista'} certificada en blockchain 🎵 "${work.title}" #MusicDibs #NuevaMusica #Blockchain`,
              };
            }
          }
        }

        await supabase.from('social_promotions').update({
          copy_ig_feed: copies.ig_feed,
          copy_ig_story: copies.ig_story,
          copy_tiktok: copies.tiktok,
          status: 'assets_ready',
          updated_at: new Date().toISOString(),
        }).eq('id', promo_id);

        console.log(`[PROMO-REGEN] Copies regenerated for promo ${promo_id}`);
      } catch (bgError: any) {
        console.error('[PROMO-REGEN] Error:', bgError);
        await supabase.from('social_promotions').update({
          status: 'assets_ready', // revert to previous usable status
          error_detail: `Regen failed: ${bgError.message}`,
          updated_at: new Date().toISOString(),
        }).eq('id', promo_id);
      }
    })();

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[PROMO-REGEN] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
