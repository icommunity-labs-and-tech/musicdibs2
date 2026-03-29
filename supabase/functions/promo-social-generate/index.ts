import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWorkMetadata(supabase: any, workId: string, userId: string) {
  const [workRes, genRes] = await Promise.all([
    supabase
      .from('works')
      .select('title, author, description, type, certificate_url, checker_url')
      .eq('id', workId)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('ai_generations')
      .select('prompt, genre, mood')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const work = workRes.data;
  if (!work) return null;

  // Try to match an ai_generation to this work by title similarity
  const aiGen = genRes.data?.find((g: any) =>
    work.title && g.prompt && g.prompt.toLowerCase().includes(work.title.toLowerCase())
  ) || genRes.data?.[0] || null;

  return { work, aiGen };
}

function buildImagePrompt(work: any, aiGen: any): string {
  const parts = [
    `Professional music promotion artwork for "${work.title}" by ${work.author || 'artist'}.`,
  ];
  if (aiGen?.genre) parts.push(`Genre: ${aiGen.genre}.`);
  if (aiGen?.mood) parts.push(`Mood: ${aiGen.mood}.`);
  if (work.type) parts.push(`Type: ${work.type}.`);
  if (work.description) parts.push(`Context: ${work.description.slice(0, 100)}.`);
  if (aiGen?.prompt) parts.push(`Original AI concept: ${aiGen.prompt.slice(0, 120)}.`);
  parts.push('Dark purple and violet gradient background with gold accents. Modern minimalist design. Square format 1080x1080. High quality, professional.');
  return parts.join(' ');
}

function buildCopiesPrompt(work: any, aiGen: any): string {
  const lines = [
    `Genera 3 copies para promocionar esta obra musical en redes sociales.`,
    '',
    `Obra: "${work.title}"`,
    `Artista: "${work.author || 'Artista'}"`,
    `Tipo: ${work.type || 'obra musical'}`,
  ];
  if (aiGen?.genre) lines.push(`Género: ${aiGen.genre}`);
  if (aiGen?.mood) lines.push(`Mood: ${aiGen.mood}`);
  if (work.description) lines.push(`Descripción: ${work.description}`);
  if (aiGen?.prompt) lines.push(`Prompt IA original: ${aiGen.prompt.slice(0, 150)}`);
  if (work.checker_url) lines.push(`Verificar en blockchain: ${work.checker_url}`);
  lines.push('');
  lines.push(`Genera exactamente este JSON:
{
  "ig_feed": "Copy para Instagram Feed (máx 150 chars, 2-3 emojis, 3-5 hashtags musicales relevantes, menciona que está certificado en blockchain)",
  "ig_story": "Copy para Instagram Story (máx 80 chars, directo, impactante, 1-2 emojis)",
  "tiktok": "Copy para TikTok (máx 150 chars, tono joven y viral, 3-5 hashtags trending de música)"
}

Idioma: español. Tono: auténtico, no corporativo.`);
  return lines.join('\n');
}

const IMAGE_MODELS = [
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3-pro-image-preview',
  'google/gemini-2.5-flash-image',
];

async function generateImageWithNanoBanana(prompt: string, apiKey: string): Promise<string | null> {
  for (const model of IMAGE_MODELS) {
    console.log(`[PROMO] Trying image model: ${model}`);
    try {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[PROMO] Model ${model} HTTP error ${res.status}:`, errText);
        if (res.status === 410 || res.status === 404) continue; // model deprecated, try next
        if (res.status === 429) continue; // rate limited, try next
        continue;
      }

      const data = await res.json();
      console.log(`[PROMO] Model ${model} response keys:`, Object.keys(data));
      
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        console.log(`[PROMO] Image generated successfully with ${model}, length: ${imageUrl.length}`);
        return imageUrl;
      }
      
      // Log the full response structure for debugging
      const msg = data.choices?.[0]?.message;
      console.warn(`[PROMO] Model ${model} returned no image. Content: ${JSON.stringify(msg).slice(0, 300)}`);
    } catch (err: any) {
      console.error(`[PROMO] Model ${model} exception:`, err.message);
    }
  }
  console.error('[PROMO] All image models failed');
  return null;
}

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

    // Verify credits
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

    // Fetch work + AI generation metadata
    const meta = await fetchWorkMetadata(supabase, work_id, user.id);
    if (!meta) {
      return new Response(JSON.stringify({ error: 'Work not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { work, aiGen } = meta;

    // Deduct credits
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

    // Create promo record
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

    const responseData = { promo_id: promo.id, status: 'generating' };

    // Background processing
    (async () => {
      try {
        // ── 1. Generate copies with Claude (parallel) ──
        const copiesPromise = fetch('https://api.anthropic.com/v1/messages', {
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
            messages: [{ role: 'user', content: buildCopiesPrompt(work, aiGen) }]
          })
        });

        // ── 2. Generate image with Nano Banana 2 (parallel) ──
        const imagePrompt = buildImagePrompt(work, aiGen);
        const imagePromise = generateImageWithNanoBanana(imagePrompt, LOVABLE_API_KEY);

        const [copiesRes, base64Image] = await Promise.all([copiesPromise, imagePromise]);

        let copies = { ig_feed: '', ig_story: '', tiktok: '' };
        let imageUrl = '';

        // Process copies
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

        // Process image - upload base64 to storage
        if (base64Image && base64Image.startsWith('data:image')) {
          const base64Data = base64Image.split(',')[1];
          const imgBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
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
          }
        }

        // Update DB
        await supabase.from('social_promotions').update({
          copy_ig_feed: copies.ig_feed,
          copy_ig_story: copies.ig_story,
          copy_tiktok: copies.tiktok,
          image_url: imageUrl || null,
          status: 'assets_ready',
          updated_at: new Date().toISOString(),
        }).eq('id', promo.id);

        // ── 3. Send email ──
        const artistEmail = user.email;
        const artistName = profile.display_name || 'Artista';

        const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
  <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:800;">MUSICDIBS</h1>
  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Registro de Propiedad Intelectual</p>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="color:#18181b;font-size:22px;margin:0 0 16px;">🎉 ¡Tu obra ya está en redes!</h2>
  <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">Hola ${artistName}, hemos preparado todos los assets para promocionar "${work.title}"</p>
  ${imageUrl ? `<div style="text-align:center;margin:0 0 24px;"><img src="${imageUrl}" width="400" style="border-radius:8px;max-width:100%;" alt="Promo ${work.title}" /><p style="color:#71717a;font-size:12px;margin:8px 0 0;">⬇️ Guarda esta imagen</p></div>` : ''}
  <h3 style="color:#18181b;font-size:16px;margin:0 0 16px;">📱 Copies listos</h3>
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
  ${work.checker_url ? `<div style="text-align:center;margin:24px 0;"><a href="${work.checker_url}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">🔗 Ver certificado blockchain</a></div>` : ''}
  <p style="text-align:center;color:#71717a;font-size:13px;margin:24px 0 0;">Sigue creando música protegida con MusicDibs 🎵</p>
</td></tr>
<tr><td style="background:#fafafa;padding:16px;text-align:center;border-top:1px solid #e4e4e7;">
  <a href="https://musicdibs.com" style="color:#a1a1aa;font-size:12px;text-decoration:none;">musicdibs.com</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

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

        await supabase.from('social_promotions').update({
          status: emailRes.ok ? 'completed' : 'assets_ready',
          email_sent_at: emailRes.ok ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('id', promo.id);

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

        // Refund credits
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
