import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

    const body = await req.json();
    const { work_id, artist_name, song_title, description, external_link, team_notes, media_file_path } = body;

    if (!artist_name || !song_title || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert premium promo request
    const { data: promo, error: insertError } = await supabase
      .from('premium_social_promotions')
      .insert({
        user_id: user.id,
        work_id: work_id || null,
        artist_name,
        song_title,
        description,
        promo_style: null,
        promo_message: null,
        external_link: external_link || null,
        team_notes: team_notes || null,
        media_file_path: media_file_path || null,
        status: 'submitted',
        credits_spent: 30,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[PREMIUM-PROMO] Insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notification email to marketing
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#0d0618;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0618;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:0 0 30px;">
          <h2 style="margin:0;color:#a855f7;font-size:22px;font-weight:800;letter-spacing:1px;">MUSICDIBS</h2>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">Nueva solicitud de Promo Premium</p>
        </td></tr>
        <tr><td style="background-color:#1a0a2e;border-radius:16px;padding:40px 36px;">
          <h1 style="margin:0 0 24px;color:#f3f4f6;font-size:22px;font-weight:700;text-align:center;">👑 Nueva Promo Premium</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.12));border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:20px 24px;margin-bottom:16px;">
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid rgba(245,158,11,0.15);width:140px;">Artista</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;border-bottom:1px solid rgba(245,158,11,0.15);">${escapeHtml(artist_name)}</td></tr>
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid rgba(245,158,11,0.15);width:140px;">Canción</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;border-bottom:1px solid rgba(245,158,11,0.15);">${escapeHtml(song_title)}</td></tr>
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid rgba(245,158,11,0.15);width:140px;">Email</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;border-bottom:1px solid rgba(245,158,11,0.15);">${escapeHtml(user.email || '—')}</td></tr>
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid rgba(245,158,11,0.15);width:140px;">Letra</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;border-bottom:1px solid rgba(245,158,11,0.15);">${escapeHtml(description.length > 200 ? description.slice(0, 200) + '…' : description)}</td></tr>
            ${external_link ? `<tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid rgba(245,158,11,0.15);width:140px;">Enlaces / Notas</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;border-bottom:1px solid rgba(245,158,11,0.15);">${escapeHtml(external_link)}</td></tr>` : ''}
            ${media_file_path ? `<tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;width:140px;">Archivo adjunto</td><td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;">Sí (ver en panel admin)</td></tr>` : ''}
          </table>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">ID: ${promo.id} · Créditos: ${promo.credits_spent}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MusicDibs <noreply@notify.musicdibs.com>',
            to: ['marketing@musicdibs.com'],
            cc: ['hello@icommunity.io'],
            subject: `👑 Nueva Promo Premium: ${artist_name} — ${song_title}`,
            html,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error('[PREMIUM-PROMO] Email send error:', emailRes.status, errText);
        } else {
          console.log('[PREMIUM-PROMO] Email sent to marketing@musicdibs.com');
        }
      } catch (emailErr) {
        console.error('[PREMIUM-PROMO] Email exception:', emailErr);
      }
    } else {
      console.warn('[PREMIUM-PROMO] RESEND_API_KEY not set, skipping email');
    }

    console.log(`[PREMIUM-PROMO] Request submitted: ${promo.id} by ${user.id}`);

    return new Response(JSON.stringify({ success: true, promo_id: promo.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[PREMIUM-PROMO] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
