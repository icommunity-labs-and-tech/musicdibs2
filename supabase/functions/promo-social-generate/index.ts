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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!ANTHROPIC_API_KEY || !LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API keys' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { work_id } = await req.json();
    if (!work_id) {
      return new Response(JSON.stringify({ error: 'work_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar créditos
    const CREDITS_COST = 25;
    const { data: profile } = await supabase
      .from('profiles')
      .select('available_credits, display_name')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.available_credits < CREDITS_COST) {
      return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Obtener datos de la obra (completos)
    const { data: work } = await supabase
      .from('works')
      .select('title, author, description, type, certificate_url, checker_url, blockchain_hash, blockchain_network, certified_at, created_at')
      .eq('id', work_id)
      .eq('user_id', user.id)
      .single();

    if (!work) {
      return new Response(JSON.stringify({ error: 'Work not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Obtener metadatos de generación IA (si la obra fue creada con AI Studio)
    const { data: aiGen } = await supabase
      .from('ai_generations')
      .select('prompt, genre, mood, duration')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Buscar la generación IA más relevante (por coincidencia de título/prompt)
    const titleLower = work.title.toLowerCase();
    const matchingGen = aiGen?.find((g: any) =>
      g.prompt?.toLowerCase().includes(titleLower) ||
      titleLower.includes(g.prompt?.toLowerCase()?.slice(0, 20) || '___')
    ) || aiGen?.[0] || null;

    // Obtener perfil artístico del usuario (si existe)
    const { data: artistProfile } = await supabase
      .from('user_artist_profiles')
      .select('name, genre, mood, style_notes')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    // ── Construir contexto enriquecido ──
    const workType = work.type || 'audio';
    const genre = matchingGen?.genre || artistProfile?.genre || '';
    const mood = matchingGen?.mood || artistProfile?.mood || '';
    const styleNotes = artistProfile?.style_notes || '';
    const aiPrompt = matchingGen?.prompt || '';
    const isCertified = !!work.certified_at;
    const blockchainInfo = work.blockchain_hash
      ? `Certificado en ${work.blockchain_network || 'blockchain'}`
      : '';

    const contextBlock = [
      `Título: "${work.title}"`,
      `Artista: "${work.author || profile.display_name || 'Artista'}"`,
      `Tipo: ${workType}`,
      work.description ? `Descripción: ${work.description}` : '',
      genre ? `Género: ${genre}` : '',
      mood ? `Mood/Ambiente: ${mood}` : '',
      styleNotes ? `Estilo del artista: ${styleNotes}` : '',
      aiPrompt ? `Prompt IA original: ${aiPrompt}` : '',
      isCertified ? `✅ Obra certificada en blockchain (${work.blockchain_network || 'Ethereum'})` : '',
      work.checker_url ? `URL verificación: ${work.checker_url}` : '',
    ].filter(Boolean).join('\n');

    console.log('[PROMO-SOCIAL] Context block:', contextBlock);

    // Descontar créditos
    await supabase.from('profiles').update({
      available_credits: profile.available_credits - CREDITS_COST,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -CREDITS_COST,
      type: 'usage',
      description: `Promoción RRSS: ${work.title}`,
    });

    // Crear registro de promoción
    const { data: promo, error: promoError } = await supabase
      .from('social_promotions')
      .insert({
        user_id: user.id,
        work_id,
        status: 'generating',
        credits_spent: CREDITS_COST,
      })
      .select()
      .single();

    if (promoError || !promo) {
      return new Response(JSON.stringify({ error: 'Failed to create promotion' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Responder inmediatamente — procesamiento en background
    const responseData = { promo_id: promo.id, status: 'generating' };

    // Procesar en background
    (async () => {
      try {
        // ── 1. Generar copies con Claude Haiku (paralelo) ──
        const copiesPromise = fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            system: `Eres un experto en marketing musical y redes sociales. 
Genera copies virales y auténticos para promocionar obras musicales.
Adapta el tono al género y mood de la obra. Si es reggaetón, sé urbano; si es indie, sé poético; si es electrónica, sé futurista.
Responde SOLO con JSON válido, sin markdown ni explicaciones.`,
            messages: [{
              role: 'user',
              content: `Genera 3 copies para promocionar esta obra musical en redes sociales.

${contextBlock}

Genera exactamente este JSON:
{
  "ig_feed": "Copy para Instagram Feed (máx 180 chars, 2-3 emojis coherentes con el género, 3-5 hashtags musicales relevantes al género/mood, ${isCertified ? 'menciona certificación blockchain' : 'menciona que es nuevo lanzamiento'})",
  "ig_story": "Copy para Instagram Story (máx 100 chars, directo, impactante, 1-2 emojis, call-to-action claro)",
  "tiktok": "Copy para TikTok (máx 180 chars, tono joven y viral acorde al género, 3-5 hashtags trending de música y del género específico)"
}

Idioma: español. Tono: auténtico, adaptado al género musical. NO uses lenguaje corporativo.
${genre ? `Adapta el tono al ${genre}.` : ''}
${mood ? `El ambiente es: ${mood}.` : ''}`
            }]
          })
        });

        // ── 2. Generar imagen con Nano Banana 2 (Lovable AI gateway) ──
        const imagePromptParts = [
          `Create a professional, visually stunning music promotion poster for a song called "${work.title}"`,
          work.author ? `by artist "${work.author}"` : '',
          genre ? `Genre: ${genre}.` : '',
          mood ? `Mood: ${mood}.` : '',
          work.description ? `Song description: ${work.description}.` : '',
          aiPrompt ? `Musical concept: ${aiPrompt}.` : '',
          `Style: Modern, high-contrast, cinematic music artwork.`,
          genre?.toLowerCase().includes('reggae') || genre?.toLowerCase().includes('urban')
            ? 'Urban aesthetic, neon lights, street vibes, bold typography feel.'
            : genre?.toLowerCase().includes('electr')
            ? 'Futuristic, synth wave, laser lights, digital aesthetic.'
            : genre?.toLowerCase().includes('rock') || genre?.toLowerCase().includes('metal')
            ? 'Dark, edgy, electric guitar silhouette, concert stage lighting.'
            : genre?.toLowerCase().includes('indie') || genre?.toLowerCase().includes('folk')
            ? 'Warm tones, vintage film grain, artistic and poetic atmosphere.'
            : genre?.toLowerCase().includes('pop')
            ? 'Bright, colorful, energetic, modern pop aesthetic.'
            : 'Abstract musical waves, dark purple and violet gradient, gold accents.',
          `Square format 1:1. No text or words in the image. Professional quality. Album cover art style.`,
          isCertified ? 'Include a subtle golden certified seal or badge element.' : '',
        ].filter(Boolean).join(' ');

        console.log('[PROMO-SOCIAL] Image prompt:', imagePromptParts);

        const imagePromise = fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image-preview',
            messages: [{
              role: 'user',
              content: imagePromptParts,
            }],
            modalities: ['image', 'text'],
          }),
        });

        // Esperar ambas en paralelo
        const [copiesRes, imageRes] = await Promise.all([copiesPromise, imagePromise]);

        let copies = { ig_feed: '', ig_story: '', tiktok: '' };
        let imageUrl = '';

        // Procesar copies
        if (copiesRes.ok) {
          const copiesData = await copiesRes.json();
          const text = copiesData.content?.[0]?.text?.trim();
          if (text) {
            try {
              copies = JSON.parse(text);
            } catch {
              // Intentar extraer JSON de bloques de código
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try { copies = JSON.parse(jsonMatch[0]); } catch { /* fallback below */ }
              }
              if (!copies.ig_feed) {
                copies = {
                  ig_feed: `🎵 "${work.title}" de ${work.author || 'nuestro artista'} ya está disponible${isCertified ? ' y certificado en blockchain' : ''}. ¡Escúchalo ahora! #MusicDibs #NuevaMusica ${genre ? `#${genre.replace(/\s+/g, '')}` : ''}`,
                  ig_story: `🔥 "${work.title}" ${isCertified ? '— certificado en blockchain ✅' : '— nuevo lanzamiento 🎶'}`,
                  tiktok: `Nueva música de ${work.author || 'artista'}${isCertified ? ' certificada en blockchain' : ''} 🎵 "${work.title}" #MusicDibs #NuevaMusica ${genre ? `#${genre.replace(/\s+/g, '')}` : ''}`,
                };
              }
            }
          }
        }

        // Procesar imagen de Nano Banana
        if (imageRes.ok) {
          const imageData = await imageRes.json();
          const base64Url = imageData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (base64Url && base64Url.startsWith('data:image/')) {
            // Extraer base64 y subir a Storage
            const base64Data = base64Url.split(',')[1];
            const binaryString = atob(base64Data);
            const imgBuffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              imgBuffer[i] = binaryString.charCodeAt(i);
            }

            const fileName = `${promo.id}.png`;

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
            } else {
              console.error('[PROMO-SOCIAL] Upload error:', uploadError);
            }
          } else {
            console.error('[PROMO-SOCIAL] No base64 image in response');
          }
        } else {
          console.error('[PROMO-SOCIAL] Image generation failed:', imageRes.status, await imageRes.text());
        }

        // Actualizar DB con assets
        await supabase.from('social_promotions').update({
          copy_ig_feed: copies.ig_feed,
          copy_ig_story: copies.ig_story,
          copy_tiktok: copies.tiktok,
          image_url: imageUrl || null,
          status: 'assets_ready',
          updated_at: new Date().toISOString(),
        }).eq('id', promo.id);

        // ── 3. Enviar email al artista con Resend ──
        const artistEmail = user.email;
        const artistName = profile.display_name || 'Artista';

        const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">MUSICDIBS</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Registro de Propiedad Intelectual</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="color:#18181b;font-size:22px;margin:0 0 16px;">🎉 ¡Tu obra ya está en redes!</h2>
          <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">Hola ${artistName}, hemos preparado todos los assets para promocionar "${work.title}"${genre ? ` (${genre})` : ''}</p>

          ${imageUrl ? `
          <div style="text-align:center;margin:0 0 24px;">
            <img src="${imageUrl}" width="400" style="border-radius:8px;max-width:100%;" alt="Promo ${work.title}" />
            <p style="color:#71717a;font-size:12px;margin:8px 0 0;">⬇️ Guarda esta imagen para tus publicaciones</p>
          </div>` : ''}

          <h3 style="color:#18181b;font-size:16px;margin:0 0 16px;">📱 Copies listos para copiar y pegar</h3>

          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:0 0 12px;">
            <p style="color:#7c3aed;font-size:11px;font-weight:700;margin:0 0 8px;text-transform:uppercase;">Instagram Feed</p>
            <p style="color:#18181b;font-size:14px;line-height:1.5;margin:0;">${copies.ig_feed}</p>
          </div>

          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:0 0 12px;">
            <p style="color:#7c3aed;font-size:11px;font-weight:700;margin:0 0 8px;text-transform:uppercase;">Instagram Story</p>
            <p style="color:#18181b;font-size:14px;line-height:1.5;margin:0;">${copies.ig_story}</p>
          </div>

          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:0 0 12px;">
            <p style="color:#7c3aed;font-size:11px;font-weight:700;margin:0 0 8px;text-transform:uppercase;">TikTok</p>
            <p style="color:#18181b;font-size:14px;line-height:1.5;margin:0;">${copies.tiktok}</p>
          </div>

          ${work.checker_url ? `
          <div style="text-align:center;margin:24px 0;">
            <a href="${work.checker_url}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
              🔗 Ver certificado blockchain
            </a>
          </div>` : ''}

          <p style="text-align:center;color:#71717a;font-size:13px;margin:24px 0 0;">
            Sigue creando música protegida con MusicDibs 🎵
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px;text-align:center;border-top:1px solid #e4e4e7;">
          <a href="https://musicdibs.com" style="color:#a1a1aa;font-size:12px;text-decoration:none;">
            musicdibs.com
          </a>
        </td></tr>
      </table>
    </td></tr>
    </table>
</body>
</html>`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MusicDibs <promo@musicdibs.com>',
            to: [artistEmail],
            subject: `🎉 Assets de promoción listos — "${work.title}"`,
            html: emailHtml,
          }),
        });

        // Actualizar estado final
        await supabase.from('social_promotions').update({
          status: emailRes.ok ? 'completed' : 'assets_ready',
          email_sent_at: emailRes.ok ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('id', promo.id);

        // Actualizar work como promovido
        await supabase.from('works').update({
          distributed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', work_id);

        console.log(`[PROMO-SOCIAL] Completed for work ${work_id}, promo ${promo.id}`);

      } catch (bgError: any) {
        console.error('[PROMO-SOCIAL] Background error:', bgError);
        await supabase.from('social_promotions').update({
          status: 'failed',
          error_detail: bgError.message,
          updated_at: new Date().toISOString(),
        }).eq('id', promo.id);

        // Reembolsar créditos si falla
        const { data: p } = await supabase.from('profiles').select('available_credits').eq('user_id', user.id).single();
        if (p) {
          await supabase.from('profiles').update({
            available_credits: p.available_credits + CREDITS_COST,
            updated_at: new Date().toISOString(),
          }).eq('user_id', user.id);
          await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: CREDITS_COST,
            type: 'refund',
            description: `Reembolso: fallo en promoción de "${work.title}"`,
          });
        }
      }
    })();

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[PROMO-SOCIAL] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});