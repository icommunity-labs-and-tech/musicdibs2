/**
 * Shared transactional email templates for MusicDibs.
 * Each function returns { subject, html, text } ready to enqueue.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(icon: string, title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0d0618;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0618;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:0 0 30px;">
          <h2 style="margin:0;color:#a855f7;font-size:22px;font-weight:800;letter-spacing:1px;">MUSICDIBS</h2>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">by iCommunity · Registro de Propiedad Intelectual</p>
        </td></tr>
        <tr><td align="center" style="padding:0 0 24px;">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#6d28d9);display:flex;align-items:center;justify-content:center;">
            <span style="font-size:32px;line-height:64px;">${icon}</span>
          </div>
        </td></tr>
        <tr><td style="background-color:#1a0a2e;border-radius:16px;padding:40px 36px;">
          <h1 style="margin:0 0 16px;color:#f3f4f6;font-size:24px;font-weight:700;text-align:center;">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:28px 20px 0;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">Este correo fue enviado automáticamente por MusicDibs.<br/><a href="https://musicdibs.com" style="color:#9ca3af;text-decoration:none;">musicdibs.com</a> · <a href="https://musicdibs.com/dashboard" style="color:#9ca3af;text-decoration:none;">Mi panel</a> · <a href="https://musicdibs.com/contact" style="color:#9ca3af;text-decoration:none;">Soporte</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function cta(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td align="center">
      <a href="${href}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${label}</a>
    </td></tr>
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid rgba(168,85,247,0.15);width:140px;">${label}</td>
    <td style="padding:8px 0;color:#f3f4f6;font-size:13px;font-weight:600;border-bottom:1px solid rgba(168,85,247,0.15);">${value}</td>
  </tr>`;
}

// ─── 1. Credit Purchase Confirmation ────────────────────────────────────────

export function creditPurchaseEmail(data: {
  name: string;
  planName: string;
  credits: number;
  invoiceUrl?: string;
}) {
  const { name, planName, credits, invoiceUrl } = data;
  const safeName = escapeHtml(name);
  const safePlan = escapeHtml(planName);

  const invoiceSection = invoiceUrl
    ? `<p style="margin:20px 0 0;text-align:center;">
        <a href="${invoiceUrl}" style="color:#a855f7;text-decoration:none;font-size:14px;">📄 Ver / descargar factura →</a>
      </p>`
    : "";

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">Hola <strong style="color:#f3f4f6;">${safeName}</strong>, tu compra se ha procesado correctamente.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(109,40,217,0.12));border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow("Plan", safePlan)}
      ${infoRow("Créditos añadidos", `+${credits}`)}
    </table>
    ${invoiceSection}
    ${cta("https://musicdibs.com/dashboard/credits", "Ver mis créditos →")}`;

  return {
    subject: `✅ Compra confirmada — ${safePlan} (+${credits} créditos)`,
    html: wrap("💳", "Compra confirmada", body),
    text: `Hola ${name}, tu compra del plan ${planName} (+${credits} créditos) se ha procesado. Accede a tu panel: https://musicdibs.com/dashboard/credits`,
  };
}

// ─── 2. Plan Change Confirmation ────────────────────────────────────────────

export function planChangeEmail(data: {
  name: string;
  oldPlan: string;
  newPlan: string;
  isUpgrade: boolean;
  creditsAdded: number;
  creditsKept?: number;
}) {
  const { name, oldPlan, newPlan, isUpgrade, creditsAdded, creditsKept } = data;
  const safeName = escapeHtml(name);

  const changeLabel = isUpgrade ? "Upgrade" : "Downgrade";
  const changeIcon = isUpgrade ? "⬆️" : "⬇️";

  const creditLine = isUpgrade
    ? `<p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">Se han añadido <strong style="color:#a855f7;">${creditsAdded} créditos</strong> a tu cuenta.</p>`
    : `<p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">Tus <strong style="color:#a855f7;">${creditsKept ?? 0} créditos</strong> actuales se mantienen hasta fin de periodo.</p>`;

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">Hola <strong style="color:#f3f4f6;">${safeName}</strong>, tu cambio de plan se ha realizado correctamente.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(109,40,217,0.12));border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow("Tipo de cambio", `${changeIcon} ${changeLabel}`)}
      ${infoRow("Plan anterior", escapeHtml(oldPlan))}
      ${infoRow("Nuevo plan", escapeHtml(newPlan))}
    </table>
    ${creditLine}
    ${cta("https://musicdibs.com/dashboard", "Ir a mi panel →")}`;

  return {
    subject: `${changeIcon} Cambio de plan — ${escapeHtml(newPlan)}`,
    html: wrap("🔄", `${changeLabel} de plan completado`, body),
    text: `Hola ${name}, tu cambio de plan de ${oldPlan} a ${newPlan} se ha completado. ${isUpgrade ? `Se añadieron ${creditsAdded} créditos.` : `Tus créditos se mantienen.`} Panel: https://musicdibs.com/dashboard`,
  };
}

// ─── 3. Work Registration Confirmation ──────────────────────────────────────

export function workCertifiedEmail(data: {
  name: string;
  workTitle: string;
  blockchainHash: string;
  network: string;
  checkerUrl?: string;
  certificateUrl?: string;
}) {
  const { name, workTitle, blockchainHash, network, checkerUrl, certificateUrl } = data;
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(workTitle);
  const shortHash = blockchainHash.length > 20
    ? blockchainHash.slice(0, 10) + "…" + blockchainHash.slice(-10)
    : blockchainHash;

  const verifyLink = checkerUrl
    ? `<p style="margin:16px 0 0;text-align:center;"><a href="${checkerUrl}" style="color:#a855f7;text-decoration:none;font-size:14px;">🔍 Verificar en blockchain →</a></p>`
    : "";

  const certLink = certificateUrl
    ? `<p style="margin:8px 0 0;text-align:center;"><a href="${certificateUrl}" style="color:#a855f7;text-decoration:none;font-size:14px;">📜 Descargar certificado →</a></p>`
    : "";

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">Hola <strong style="color:#f3f4f6;">${safeName}</strong>, tu obra ha sido registrada y certificada en blockchain de forma permanente.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(109,40,217,0.12));border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow("Obra", safeTitle)}
      ${infoRow("Red", escapeHtml(network.charAt(0).toUpperCase() + network.slice(1)))}
      ${infoRow("Hash", `<code style="font-size:12px;color:#c084fc;">${escapeHtml(shortHash)}</code>`)}
    </table>
    ${verifyLink}
    ${certLink}
    ${cta("https://musicdibs.com/dashboard", "Ver mis obras →")}`;

  return {
    subject: `🎉 Obra certificada — "${safeTitle}"`,
    html: wrap("🔐", "Obra certificada en blockchain", body),
    text: `Hola ${name}, tu obra "${workTitle}" ha sido certificada en ${network}. Hash: ${blockchainHash}. ${checkerUrl ? `Verificar: ${checkerUrl}` : ""} Panel: https://musicdibs.com/dashboard`,
  };
}

// ─── 4. Payment Failure Notification ────────────────────────────────────────

export function paymentFailedEmail(data: {
  name: string;
  description: string;
  attemptCount: number;
  nextAttempt: string | null;
}) {
  const { name, description, attemptCount, nextAttempt } = data;
  const safeName = escapeHtml(name);
  const safeDesc = escapeHtml(description);

  const nextRetryLine = nextAttempt
    ? `<p style="margin:12px 0 0;color:#d1d5db;font-size:14px;text-align:center;">Próximo reintento: <strong style="color:#f3f4f6;">${escapeHtml(new Date(nextAttempt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }))}</strong></p>`
    : `<p style="margin:12px 0 0;color:#fca5a5;font-size:14px;text-align:center;font-weight:600;">No hay más reintentos programados. Actualiza tu método de pago para evitar la cancelación.</p>`;

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">Hola <strong style="color:#f3f4f6;">${safeName}</strong>, no hemos podido procesar el cobro de tu suscripción.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(185,28,28,0.12));border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow("Detalle", safeDesc)}
      ${infoRow("Intento", `${attemptCount}`)}
    </table>
    ${nextRetryLine}
    <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;text-align:center;">Si ya has resuelto el problema, puedes ignorar este mensaje.</p>
    ${cta("https://musicdibs.com/dashboard/billing", "Actualizar método de pago →")}`;

  return {
    subject: `⚠️ Fallo en el cobro de tu suscripción — MusicDibs`,
    html: wrap("⚠️", "Fallo en el cobro", body),
    text: `Hola ${name}, no hemos podido procesar el cobro de tu suscripción. ${description}. Actualiza tu método de pago: https://musicdibs.com/dashboard/billing`,
  };
}
