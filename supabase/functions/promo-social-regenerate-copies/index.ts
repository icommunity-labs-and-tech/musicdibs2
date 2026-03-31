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

    const { promo_id, paid, tone, language } = await req.json();
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
        description: `Regeneración copies (pagada)`,
      });
    }

    // Fetch work + AI generation + lyrics + default artist profile metadata
    const [workRes, genRes, lyricsRes, profileRes] = await Promise.all([
      supabase.from('works').select('title, author, description, type, checker_url')
        .eq('id', promo.work_id).eq('user_id', user.id).single(),
      supabase.from('ai_generations').select('prompt, genre, mood')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('lyrics_generations').select('lyrics, genre, mood, theme, style, description')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('user_artist_profiles').select('name')
        .eq('user_id', user.id).eq('is_default', true).limit(1).maybeSingle(),
    ]);

    // If work not found in works table, try ai_generations
    let work = workRes.data;
    if (!work) {
      const aiGenDirect = await supabase.from('ai_generations').select('prompt, genre, mood')
        .eq('id', promo.work_id).eq('user_id', user.id).single();
      if (aiGenDirect.data) {
        work = {
          title: aiGenDirect.data.prompt || 'AI Song',
          author: profileRes.data?.name || null,
          description: [aiGenDirect.data.genre, aiGenDirect.data.mood].filter(Boolean).join(' · ') || null,
          type: 'audio',
          checker_url: null,
        };
      }
    }

    if (!work) {
      return new Response(JSON.stringify({ error: 'Work not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If work has no author, use default artist profile name
    if (!work.author && profileRes.data?.name) {
      work.author = profileRes.data.name;
    }

    const aiGen = genRes.data?.find((g: any) =>
      work.title && g.prompt?.toLowerCase().includes(work.title.toLowerCase())
    ) || null;

    const lyrics = lyricsRes.data?.find((l: any) =>
      work.title && l.description?.toLowerCase().includes(work.title.toLowerCase())
    ) || lyricsRes.data?.[0] || null;

    // Build enriched prompt with tone and language
    const tones: Record<string, string> = {
      urban: 'urbano, callejero, con flow y actitud. Usa jerga urbana moderna, referencias al trap/reggaeton/hip-hop',
      romantic: 'romántico, emotivo, sensual. Evoca sentimientos profundos, usa metáforas de amor y conexión',
      indie: 'indie, alternativo, artístico. Tono introspectivo, poético, con referencias culturales sofisticadas',
      electronic: 'electrónico, futurista, energético. Vocabulario de club/rave/festival, vibes nocturnas',
      pop: 'pop, fresco, mainstream, pegadizo. Lenguaje accesible, positivo, que enganche a todo el mundo',
      rock: 'rock, rebelde, con actitud. Energía cruda, referencias a guitarra, escenario y libertad',
    };
    const toneDesc = tone ? (tones[tone] || 'auténtico y emocional') : 'auténtico y emocional';
    const lang = language || 'español';

    const lines = [
      `Eres un copywriter de élite especializado en marketing musical viral. Genera copies COMPLETAMENTE NUEVOS y con un enfoque DIFERENTE al anterior.`,
      '',
      `## Datos de la obra`,
      `- Título: "${work.title}"`,
      `- Artista: "${work.author || 'Artista'}"`,
      `- Tipo: ${work.type || 'obra musical'}`,
    ];
    if (aiGen?.genre) lines.push(`- Género: ${aiGen.genre}`);
    if (aiGen?.mood) lines.push(`- Mood/vibra: ${aiGen.mood}`);
    if (work.description) lines.push(`- Descripción: ${work.description}`);
    if (aiGen?.prompt) lines.push(`- Concepto artístico: ${aiGen.prompt.slice(0, 200)}`);

    if (lyrics?.lyrics) {
      lines.push(`- Letra de la canción (extracto): "${lyrics.lyrics.slice(0, 500)}"`);
    }
    if (lyrics?.theme) lines.push(`- Temática lírica: ${lyrics.theme}`);

    if (work.checker_url) lines.push(`- Enlace de verificación blockchain: ${work.checker_url}`);

    lines.push('');
    lines.push(`## Instrucciones de estilo`);
    lines.push(`- TONO: ${toneDesc}. Adapta el lenguaje y las referencias culturales a este estilo musical.`);
    lines.push(`- Copies IMPACTANTES, emocionales, que generen urgencia por escuchar`);
    lines.push(`- Lenguaje auténtico, no corporativo ni genérico`);
    lines.push(`- Si tienes la letra, usa fragmentos o referencias para copies más personales`);
    lines.push(`- Usa "registrada con blockchain" (NO "certificada en blockchain")`);
    lines.push(`- Hashtags relevantes al género y tendencias actuales`);
    lines.push(`- Cada copy con personalidad propia`);
    lines.push('');
    lines.push(`## Formato de respuesta`);
    lines.push(`Responde SOLO con este JSON exacto, sin markdown, sin explicaciones:`);
    lines.push(`{
  "ig_feed": "Copy para Instagram Feed: máx 200 chars, 2-3 emojis estratégicos, 4-6 hashtags relevantes al género. Genera hype y curiosidad.",
  "ig_story": "Copy para Instagram Story: máx 100 chars, directo, impactante, urgente. 1-2 emojis.",
  "tiktok": "Copy para TikTok: máx 200 chars, tono joven, viral, conversacional. 4-6 hashtags trending."
}`);
    lines.push('');
    lines.push(`IMPORTANTE: Genera los copies en ${lang}. Tono: ${toneDesc}, apasionado, generador de hype.`);

    // Mark as regenerating
    await supabase.from('social_promotions').update({
      status: 'generating',
      regeneration_count: promo.regeneration_count + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', promo_id);

    const responseData = { promo_id, status: 'generating', regeneration_count: promo.regeneration_count + 1 };

    // Background: regenerate copies
    (async () => {
      try {
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              {
                role: 'system',
                content: `Eres un copywriter de élite del mundo de la música urbana, pop y electrónica. Creas textos que generan HYPE real en redes sociales. Responde SOLO con JSON válido, sin markdown, sin backticks, sin explicaciones.`,
              },
              { role: 'user', content: lines.join('\n') },
            ],
          }),
        });

        let copies = {
          ig_feed: `🎵 "${work.title}" de ${work.author || 'nuestro artista'} ya está disponible y registrada con blockchain. ¡Escúchala ahora! #MusicDibs #Música #NuevaMusica`,
          ig_story: `🔥 "${work.title}" — registrada con blockchain ✅`,
          tiktok: `Nueva música de ${work.author || 'artista'} registrada con blockchain 🎵 "${work.title}" #MusicDibs #NuevaMusica #Blockchain`,
        };

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            try {
              const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
              copies = JSON.parse(cleaned);
            } catch {
              console.warn('[PROMO-REGEN] Failed to parse AI response, using fallback');
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
          status: 'assets_ready',
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
