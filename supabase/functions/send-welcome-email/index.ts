import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("[WELCOME-EMAIL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, email, displayName, language } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = displayName || email.split("@")[0];
    const dashboardUrl = "https://musicdibs.com/dashboard";
    const registerUrl = "https://musicdibs.com/dashboard/register";
    const creditsUrl = "https://musicdibs.com/dashboard/credits";

    // Determine language
    const rawLang = (language || "es").slice(0, 2).toLowerCase();
    const lang = rawLang === "en" ? "en" : rawLang === "pt" ? "pt" : "es";

    const i18n: Record<string, Record<string, string>> = {
      es: {
        subtitle: "by iCommunity · Registro de Propiedad Intelectual",
        welcome: `¡Bienvenido, ${escapeHtml(name)}!`,
        intro: "Tu cuenta en MusicDibs está lista. Ahora puedes registrar tus obras musicales en blockchain y proteger tu propiedad intelectual de forma permanente e inmutable.",
        creditLabel: "crédito de bienvenida",
        creditNote: "Ya está en tu cuenta. Úsalo para registrar tu primera obra.",
        howTo: "Cómo empezar",
        step1Title: "Registra tu primera obra",
        step1Desc: "Sube tu archivo de audio, vídeo o documento.",
        step1Link: "Ir a Registrar obra →",
        step2Title: "Recibe tu certificado blockchain",
        step2Desc: "En minutos tu obra queda certificada en la red blockchain con un hash inmutable como prueba de autoría.",
        step3Title: "¿Necesitas más créditos?",
        step3Desc: "Cada registro consume 1 crédito.",
        step3Link: "Ver planes y precios →",
        ctaLabel: "Ir a mi panel →",
        footer: "Este correo fue enviado automáticamente porque te registraste en MusicDibs.",
        panel: "Mi panel",
        support: "Soporte",
        subject: "🎵 Bienvenido a MusicDibs — tu crédito de bienvenida te espera",
        textBody: `¡Bienvenido a MusicDibs, ${name}! Tu cuenta está lista. Tienes 1 crédito de bienvenida para registrar tu primera obra. Accede a tu panel: ${dashboardUrl}`,
      },
      en: {
        subtitle: "by iCommunity · Intellectual Property Registration",
        welcome: `Welcome, ${escapeHtml(name)}!`,
        intro: "Your MusicDibs account is ready. You can now register your musical works on blockchain and permanently protect your intellectual property.",
        creditLabel: "welcome credit",
        creditNote: "Already in your account. Use it to register your first work.",
        howTo: "How to get started",
        step1Title: "Register your first work",
        step1Desc: "Upload your audio, video or document file.",
        step1Link: "Go to Register work →",
        step2Title: "Receive your blockchain certificate",
        step2Desc: "In minutes your work is certified on the blockchain with an immutable hash as proof of authorship.",
        step3Title: "Need more credits?",
        step3Desc: "Each registration uses 1 credit.",
        step3Link: "See plans and pricing →",
        ctaLabel: "Go to my dashboard →",
        footer: "This email was sent automatically because you signed up for MusicDibs.",
        panel: "My dashboard",
        support: "Support",
        subject: "🎵 Welcome to MusicDibs — your welcome credit awaits",
        textBody: `Welcome to MusicDibs, ${name}! Your account is ready. You have 1 welcome credit to register your first work. Dashboard: ${dashboardUrl}`,
      },
      pt: {
        subtitle: "by iCommunity · Registro de Propriedade Intelectual",
        welcome: `Bem-vindo, ${escapeHtml(name)}!`,
        intro: "Sua conta no MusicDibs está pronta. Agora você pode registrar suas obras musicais na blockchain e proteger sua propriedade intelectual de forma permanente e imutável.",
        creditLabel: "crédito de boas-vindas",
        creditNote: "Já está na sua conta. Use-o para registrar sua primeira obra.",
        howTo: "Como começar",
        step1Title: "Registre sua primeira obra",
        step1Desc: "Envie seu arquivo de áudio, vídeo ou documento.",
        step1Link: "Ir para Registrar obra →",
        step2Title: "Receba seu certificado blockchain",
        step2Desc: "Em minutos sua obra é certificada na blockchain com um hash imutável como prova de autoria.",
        step3Title: "Precisa de mais créditos?",
        step3Desc: "Cada registro consome 1 crédito.",
        step3Link: "Ver planos e preços →",
        ctaLabel: "Ir ao meu painel →",
        footer: "Este email foi enviado automaticamente porque você se registrou no MusicDibs.",
        panel: "Meu painel",
        support: "Suporte",
        subject: "🎵 Bem-vindo ao MusicDibs — seu crédito de boas-vindas está esperando",
        textBody: `Bem-vindo ao MusicDibs, ${name}! Sua conta está pronta. Você tem 1 crédito de boas-vindas para registrar sua primeira obra. Painel: ${dashboardUrl}`,
      },
    };

    const t = i18n[lang];

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0d0618;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0618;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:0 0 30px;">
          <h2 style="margin:0;color:#a855f7;font-size:22px;font-weight:800;letter-spacing:1px;">MUSICDIBS</h2>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">${t.subtitle}</p>
        </td></tr>
        <tr><td align="center" style="padding:0 0 24px;">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#6d28d9);display:flex;align-items:center;justify-content:center;">
            <span style="font-size:32px;line-height:64px;">🎵</span>
          </div>
        </td></tr>
        <tr><td style="background-color:#1a0a2e;border-radius:16px;padding:40px 36px;">
          <h1 style="margin:0 0 16px;color:#f3f4f6;font-size:24px;font-weight:700;text-align:center;">${t.welcome}</h1>
          <p style="margin:0 0 28px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${t.intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(109,40,217,0.15));border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:20px 32px;">
                <tr>
                  <td style="padding-right:16px;"><span style="font-size:36px;font-weight:800;color:#a855f7;">1</span></td>
                  <td>
                    <p style="margin:0;color:#c084fc;font-size:14px;font-weight:600;">${t.creditLabel}</p>
                    <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">${t.creditNote}</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <h3 style="margin:0 0 20px;color:#e5e7eb;font-size:16px;font-weight:600;text-align:center;">${t.howTo}</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td width="36" valign="top" style="padding-right:12px;"><div style="width:28px;height:28px;border-radius:50%;background:#a855f7;color:#fff;font-size:14px;font-weight:700;text-align:center;line-height:28px;">1</div></td>
              <td style="padding-bottom:16px;border-bottom:1px solid rgba(168,85,247,0.15);">
                <p style="margin:0;color:#f3f4f6;font-size:14px;font-weight:600;">${t.step1Title}</p>
                <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${t.step1Desc}<br/><a href="${registerUrl}" style="color:#a855f7;text-decoration:none;">${t.step1Link}</a></p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td width="36" valign="top" style="padding-right:12px;"><div style="width:28px;height:28px;border-radius:50%;background:#a855f7;color:#fff;font-size:14px;font-weight:700;text-align:center;line-height:28px;">2</div></td>
              <td style="padding-bottom:16px;border-bottom:1px solid rgba(168,85,247,0.15);">
                <p style="margin:0;color:#f3f4f6;font-size:14px;font-weight:600;">${t.step2Title}</p>
                <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${t.step2Desc}</p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td width="36" valign="top" style="padding-right:12px;"><div style="width:28px;height:28px;border-radius:50%;background:#a855f7;color:#fff;font-size:14px;font-weight:700;text-align:center;line-height:28px;">3</div></td>
              <td>
                <p style="margin:0;color:#f3f4f6;font-size:14px;font-weight:600;">${t.step3Title}</p>
                <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${t.step3Desc}<br/><a href="${creditsUrl}" style="color:#a855f7;text-decoration:none;">${t.step3Link}</a></p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${dashboardUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${t.ctaLabel}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 20px 0;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">${t.footer}<br/><a href="https://musicdibs.com" style="color:#9ca3af;text-decoration:none;">musicdibs.com</a> · <a href="${dashboardUrl}" style="color:#9ca3af;text-decoration:none;">${t.panel}</a> · <a href="https://musicdibs.com/contact" style="color:#9ca3af;text-decoration:none;">${t.support}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const supabase = createClient(supabaseUrl, serviceKey);
    const messageId = crypto.randomUUID();

    // Log pending
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "welcome_email",
      recipient_email: email,
      status: "pending",
    });

    // Enqueue via pgmq for async processing by process-email-queue
    const { data: msgId, error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        idempotency_key: `welcome-${messageId}`,
        message_id: messageId,
        to: email,
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        sender_domain: "notify.musicdibs.com",
        subject: t.subject,
        html,
        text: t.textBody,
        purpose: "transactional",
        label: "welcome_email",
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error("[WELCOME-EMAIL] Enqueue error:", enqueueError);
      return new Response(
        JSON.stringify({ error: "Failed to enqueue email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WELCOME-EMAIL] Enqueued for ${email}, msgId: ${msgId}, messageId: ${messageId}`);

    return new Response(
      JSON.stringify({ success: true, msgId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[WELCOME-EMAIL] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
