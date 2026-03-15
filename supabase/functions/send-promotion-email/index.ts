import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistName, mainLink, workTitle, description, promotionGoal, socialNetworks } = await req.json();

    if (!artistName || !mainLink || !workTitle || !description || !promotionGoal) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
    .header p { color: #a0a0b0; margin: 4px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .field { margin-bottom: 20px; }
    .field-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 4px; }
    .field-value { font-size: 15px; color: #1f2937; line-height: 1.5; }
    .field-value a { color: #3b82f6; text-decoration: none; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer { background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎤 Nueva solicitud de promoción</h1>
      <p>MusicDibs — Panel de artistas</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="field-label">Nombre artístico</div>
        <div class="field-value">${escapeHtml(artistName)}</div>
      </div>
      <div class="field">
        <div class="field-label">Título de la obra</div>
        <div class="field-value">${escapeHtml(workTitle)}</div>
      </div>
      <div class="field">
        <div class="field-label">Enlace principal</div>
        <div class="field-value"><a href="${escapeHtml(mainLink)}">${escapeHtml(mainLink)}</a></div>
      </div>
      <hr class="divider">
      <div class="field">
        <div class="field-label">Descripción</div>
        <div class="field-value">${escapeHtml(description).replace(/\n/g, "<br>")}</div>
      </div>
      <div class="field">
        <div class="field-label">Objetivo de promoción</div>
        <div class="field-value">${escapeHtml(promotionGoal)}</div>
      </div>
      ${socialNetworks ? `
      <div class="field">
        <div class="field-label">Redes sociales</div>
        <div class="field-value">${escapeHtml(socialNetworks)}</div>
      </div>` : ""}
    </div>
    <div class="footer">
      Este correo fue generado automáticamente desde el panel de MusicDibs.
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MusicDibs <noreply@notify.musicdibs.com>",
        to: ["hello@icommunity.io"],
        subject: `Nueva solicitud de promoción: ${artistName} — ${workTitle}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error(`Resend API error [${emailRes.status}]:`, errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await emailRes.json();
    console.log("Email sent successfully:", result.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
