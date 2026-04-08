/**
 * Shared transactional email templates for MusicDibs.
 * Each function returns { subject, html, text } ready to enqueue.
 * All templates support ES, EN, PT via the `lang` parameter.
 */

type Lang = "es" | "en" | "pt";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const footerTexts: Record<Lang, { auto: string; panel: string; support: string }> = {
  es: { auto: "Este correo fue enviado automáticamente por MusicDibs.", panel: "Mi panel", support: "Soporte" },
  en: { auto: "This email was sent automatically by MusicDibs.", panel: "My dashboard", support: "Support" },
  pt: { auto: "Este email foi enviado automaticamente por MusicDibs.", panel: "Meu painel", support: "Suporte" },
};

function wrap(icon: string, title: string, body: string, lang: Lang = "es"): string {
  const f = footerTexts[lang] || footerTexts.es;
  return `<!DOCTYPE html>
<html lang="${lang}">
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
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">${f.auto}<br/><a href="https://musicdibs.com" style="color:#9ca3af;text-decoration:none;">musicdibs.com</a> · <a href="https://musicdibs.com/dashboard" style="color:#9ca3af;text-decoration:none;">${f.panel}</a> · <a href="https://musicdibs.com/contact" style="color:#9ca3af;text-decoration:none;">${f.support}</a></p>
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

function normLang(l?: string): Lang {
  if (!l) return "es";
  const short = l.slice(0, 2).toLowerCase();
  if (short === "en") return "en";
  if (short === "pt") return "pt";
  return "es";
}

// ─── 1. Credit Purchase Confirmation ────────────────────────────────────────

const t1: Record<Lang, { greeting: string; processed: string; plan: string; creditsAdded: string; invoice: string; viewCredits: string; subject: (plan: string, credits: number) => string; text: (name: string, plan: string, credits: number) => string }> = {
  es: {
    greeting: "tu compra se ha procesado correctamente.",
    processed: "Compra confirmada",
    plan: "Plan",
    creditsAdded: "Créditos añadidos",
    invoice: "📄 Ver / descargar factura →",
    viewCredits: "Ver mis créditos →",
    subject: (plan, credits) => `✅ Compra confirmada — ${plan} (+${credits} créditos)`,
    text: (name, plan, credits) => `Hola ${name}, tu compra del plan ${plan} (+${credits} créditos) se ha procesado. Panel: https://musicdibs.com/dashboard/credits`,
  },
  en: {
    greeting: "your purchase has been processed successfully.",
    processed: "Purchase confirmed",
    plan: "Plan",
    creditsAdded: "Credits added",
    invoice: "📄 View / download invoice →",
    viewCredits: "View my credits →",
    subject: (plan, credits) => `✅ Purchase confirmed — ${plan} (+${credits} credits)`,
    text: (name, plan, credits) => `Hi ${name}, your ${plan} plan purchase (+${credits} credits) has been processed. Dashboard: https://musicdibs.com/dashboard/credits`,
  },
  pt: {
    greeting: "sua compra foi processada com sucesso.",
    processed: "Compra confirmada",
    plan: "Plano",
    creditsAdded: "Créditos adicionados",
    invoice: "📄 Ver / baixar fatura →",
    viewCredits: "Ver meus créditos →",
    subject: (plan, credits) => `✅ Compra confirmada — ${plan} (+${credits} créditos)`,
    text: (name, plan, credits) => `Olá ${name}, sua compra do plano ${plan} (+${credits} créditos) foi processada. Painel: https://musicdibs.com/dashboard/credits`,
  },
};

export function creditPurchaseEmail(data: { name: string; planName: string; credits: number; invoiceUrl?: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t1[lang];
  const safeName = escapeHtml(data.name);
  const safePlan = escapeHtml(data.planName);
  const invoiceSection = data.invoiceUrl ? `<p style="margin:20px 0 0;text-align:center;"><a href="${data.invoiceUrl}" style="color:#a855f7;text-decoration:none;font-size:14px;">${i.invoice}</a></p>` : "";

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola"} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(109,40,217,0.12));border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.plan, safePlan)}
      ${infoRow(i.creditsAdded, `+${data.credits}`)}
    </table>
    ${invoiceSection}
    ${cta("https://musicdibs.com/dashboard/credits", i.viewCredits)}`;

  return {
    subject: i.subject(safePlan, data.credits),
    html: wrap("💳", i.processed, body, lang),
    text: i.text(data.name, data.planName, data.credits),
  };
}

// ─── 2. Plan Change Confirmation ────────────────────────────────────────────

const t2: Record<Lang, { greeting: string; changeType: string; oldPlan: string; newPlan: string; creditsAdded: (n: number) => string; creditsKept: (n: number) => string; goPanel: string; upgrade: string; downgrade: string }> = {
  es: { greeting: "tu cambio de plan se ha realizado correctamente.", changeType: "Tipo de cambio", oldPlan: "Plan anterior", newPlan: "Nuevo plan", creditsAdded: (n) => `Se han añadido <strong style="color:#a855f7;">${n} créditos</strong> a tu cuenta.`, creditsKept: (n) => `Tus <strong style="color:#a855f7;">${n} créditos</strong> actuales se mantienen hasta fin de periodo.`, goPanel: "Ir a mi panel →", upgrade: "Upgrade", downgrade: "Downgrade" },
  en: { greeting: "your plan change has been completed successfully.", changeType: "Change type", oldPlan: "Previous plan", newPlan: "New plan", creditsAdded: (n) => `<strong style="color:#a855f7;">${n} credits</strong> have been added to your account.`, creditsKept: (n) => `Your current <strong style="color:#a855f7;">${n} credits</strong> are kept until the end of the period.`, goPanel: "Go to my dashboard →", upgrade: "Upgrade", downgrade: "Downgrade" },
  pt: { greeting: "sua mudança de plano foi concluída com sucesso.", changeType: "Tipo de mudança", oldPlan: "Plano anterior", newPlan: "Novo plano", creditsAdded: (n) => `<strong style="color:#a855f7;">${n} créditos</strong> foram adicionados à sua conta.`, creditsKept: (n) => `Seus <strong style="color:#a855f7;">${n} créditos</strong> atuais são mantidos até o final do período.`, goPanel: "Ir ao meu painel →", upgrade: "Upgrade", downgrade: "Downgrade" },
};

export function planChangeEmail(data: { name: string; oldPlan: string; newPlan: string; isUpgrade: boolean; creditsAdded: number; creditsKept?: number; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t2[lang];
  const safeName = escapeHtml(data.name);
  const changeLabel = data.isUpgrade ? i.upgrade : i.downgrade;
  const changeIcon = data.isUpgrade ? "⬆️" : "⬇️";
  const creditLine = data.isUpgrade
    ? `<p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.creditsAdded(data.creditsAdded)}</p>`
    : `<p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.creditsKept(data.creditsKept ?? 0)}</p>`;

  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";
  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(109,40,217,0.12));border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.changeType, `${changeIcon} ${changeLabel}`)}
      ${infoRow(i.oldPlan, escapeHtml(data.oldPlan))}
      ${infoRow(i.newPlan, escapeHtml(data.newPlan))}
    </table>
    ${creditLine}
    ${cta("https://musicdibs.com/dashboard", i.goPanel)}`;

  const titleMap: Record<Lang, string> = { es: `${changeLabel} de plan completado`, en: `Plan ${changeLabel.toLowerCase()} completed`, pt: `${changeLabel} de plano concluído` };
  return {
    subject: `${changeIcon} ${titleMap[lang]} — ${escapeHtml(data.newPlan)}`,
    html: wrap("🔄", titleMap[lang], body, lang),
    text: `${greeting} ${data.name}, ${i.greeting}`,
  };
}

// ─── 3. Work Registration Confirmation ──────────────────────────────────────

const t3: Record<Lang, { greeting: string; title: string; work: string; network: string; hash: string; verify: string; cert: string; viewWorks: string; subject: (t: string) => string }> = {
  es: { greeting: "tu obra ha sido registrada y certificada en blockchain de forma permanente.", title: "Obra certificada en blockchain", work: "Obra", network: "Red", hash: "Hash", verify: "🔍 Verificar en blockchain →", cert: "📜 Descargar certificado →", viewWorks: "Ver mis obras →", subject: (t) => `🎉 Obra certificada — "${t}"` },
  en: { greeting: "your work has been registered and permanently certified on blockchain.", title: "Work certified on blockchain", work: "Work", network: "Network", hash: "Hash", verify: "🔍 Verify on blockchain →", cert: "📜 Download certificate →", viewWorks: "View my works →", subject: (t) => `🎉 Work certified — "${t}"` },
  pt: { greeting: "sua obra foi registrada e certificada permanentemente na blockchain.", title: "Obra certificada na blockchain", work: "Obra", network: "Rede", hash: "Hash", verify: "🔍 Verificar na blockchain →", cert: "📜 Baixar certificado →", viewWorks: "Ver minhas obras →", subject: (t) => `🎉 Obra certificada — "${t}"` },
};

export function workCertifiedEmail(data: { name: string; workTitle: string; blockchainHash: string; network: string; checkerUrl?: string; certificateUrl?: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t3[lang];
  const safeName = escapeHtml(data.name);
  const safeTitle = escapeHtml(data.workTitle);
  const shortHash = data.blockchainHash.length > 20 ? data.blockchainHash.slice(0, 10) + "…" + data.blockchainHash.slice(-10) : data.blockchainHash;
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";
  const verifyLink = data.checkerUrl ? `<p style="margin:16px 0 0;text-align:center;"><a href="${data.checkerUrl}" style="color:#a855f7;text-decoration:none;font-size:14px;">${i.verify}</a></p>` : "";
  const certLink = data.certificateUrl ? `<p style="margin:8px 0 0;text-align:center;"><a href="${data.certificateUrl}" style="color:#a855f7;text-decoration:none;font-size:14px;">${i.cert}</a></p>` : "";

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(109,40,217,0.12));border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.work, safeTitle)}
      ${infoRow(i.network, escapeHtml(data.network.charAt(0).toUpperCase() + data.network.slice(1)))}
      ${infoRow(i.hash, `<code style="font-size:12px;color:#c084fc;">${escapeHtml(shortHash)}</code>`)}
    </table>
    ${verifyLink}${certLink}
    ${cta("https://musicdibs.com/dashboard", i.viewWorks)}`;

  return { subject: i.subject(safeTitle), html: wrap("🔐", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 4. KYC Verification In Process ─────────────────────────────────────────

const t4: Record<Lang, { greeting: string; title: string; status: string; time: string; note: string; goPanel: string; subject: string }> = {
  es: { greeting: "hemos recibido tu solicitud de verificación de identidad.", title: "Verificación en proceso", status: "Estado", time: "Tiempo estimado", note: "Te notificaremos por email en cuanto el resultado esté disponible. No es necesario que hagas nada más.", goPanel: "Ir a mi panel →", subject: "🔄 Verificación de identidad en proceso — MusicDibs" },
  en: { greeting: "we have received your identity verification request.", title: "Verification in progress", status: "Status", time: "Estimated time", note: "We will notify you by email as soon as the result is available. No further action is needed.", goPanel: "Go to my dashboard →", subject: "🔄 Identity verification in progress — MusicDibs" },
  pt: { greeting: "recebemos sua solicitação de verificação de identidade.", title: "Verificação em andamento", status: "Status", time: "Tempo estimado", note: "Notificaremos você por email assim que o resultado estiver disponível. Não é necessário fazer mais nada.", goPanel: "Ir ao meu painel →", subject: "🔄 Verificação de identidade em andamento — MusicDibs" },
};

export function kycInProcessEmail(data: { name: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t4[lang];
  const safeName = escapeHtml(data.name);
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";
  const statusLabels: Record<Lang, string> = { es: "🔄 En proceso", en: "🔄 In progress", pt: "🔄 Em andamento" };
  const timeLabels: Record<Lang, string> = { es: "Hasta 48 horas", en: "Up to 48 hours", pt: "Até 48 horas" };

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.12));border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.status, statusLabels[lang])}
      ${infoRow(i.time, timeLabels[lang])}
    </table>
    <p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.note}</p>
    ${cta("https://musicdibs.com/dashboard", i.goPanel)}`;

  return { subject: i.subject, html: wrap("🔄", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 5. KYC Verification Success ────────────────────────────────────────────

const t5: Record<Lang, { greeting: string; title: string; status: string; note: string; registerCta: string; subject: string }> = {
  es: { greeting: "tu identidad ha sido verificada correctamente.", title: "Identidad verificada", status: "Estado", note: "Ya puedes registrar tus obras sin restricciones. ¡Protege tu propiedad intelectual hoy!", registerCta: "Registrar una obra →", subject: "✅ Identidad verificada — MusicDibs" },
  en: { greeting: "your identity has been verified successfully.", title: "Identity verified", status: "Status", note: "You can now register your works without restrictions. Protect your intellectual property today!", registerCta: "Register a work →", subject: "✅ Identity verified — MusicDibs" },
  pt: { greeting: "sua identidade foi verificada com sucesso.", title: "Identidade verificada", status: "Status", note: "Agora você pode registrar suas obras sem restrições. Proteja sua propriedade intelectual hoje!", registerCta: "Registrar uma obra →", subject: "✅ Identidade verificada — MusicDibs" },
};

export function kycVerifiedEmail(data: { name: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t5[lang];
  const safeName = escapeHtml(data.name);
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";
  const statusLabels: Record<Lang, string> = { es: "✅ Verificada", en: "✅ Verified", pt: "✅ Verificada" };

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.12));border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.status, statusLabels[lang])}
    </table>
    <p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.note}</p>
    ${cta("https://musicdibs.com/dashboard/register", i.registerCta)}`;

  return { subject: i.subject, html: wrap("✅", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 6. KYC Verification Failed ─────────────────────────────────────────────

const t6: Record<Lang, { greeting: string; title: string; status: string; reason: string; defaultReason: string; note: string; retryCta: string; subject: string }> = {
  es: { greeting: "lamentamos informarte de que la verificación de identidad no se ha completado correctamente.", title: "Verificación no superada", status: "Estado", reason: "Motivo", defaultReason: "No se pudo completar la verificación de identidad.", note: "No te preocupes, puedes repetir el proceso de verificación en cualquier momento desde tu panel de control.", retryCta: "Reintentar verificación →", subject: "❌ Verificación de identidad no superada — MusicDibs" },
  en: { greeting: "we regret to inform you that the identity verification was not completed successfully.", title: "Verification failed", status: "Status", reason: "Reason", defaultReason: "Identity verification could not be completed.", note: "Don't worry, you can retry the verification process at any time from your dashboard.", retryCta: "Retry verification →", subject: "❌ Identity verification failed — MusicDibs" },
  pt: { greeting: "lamentamos informar que a verificação de identidade não foi concluída com sucesso.", title: "Verificação não aprovada", status: "Status", reason: "Motivo", defaultReason: "A verificação de identidade não pôde ser concluída.", note: "Não se preocupe, você pode repetir o processo de verificação a qualquer momento pelo seu painel.", retryCta: "Tentar novamente →", subject: "❌ Verificação de identidade não aprovada — MusicDibs" },
};

export function kycFailedEmail(data: { name: string; reason?: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t6[lang];
  const safeName = escapeHtml(data.name);
  const safeReason = data.reason ? escapeHtml(data.reason) : i.defaultReason;
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";
  const statusLabels: Record<Lang, string> = { es: "❌ No superada", en: "❌ Failed", pt: "❌ Não aprovada" };

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(185,28,28,0.12));border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.status, statusLabels[lang])}
      ${infoRow(i.reason, safeReason)}
    </table>
    <p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.note}</p>
    ${cta("https://musicdibs.com/dashboard/identity", i.retryCta)}`;

  return { subject: i.subject, html: wrap("❌", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 6b. KYC Rejected by Admin ──────────────────────────────────────────────

const t6b: Record<Lang, { greeting: string; title: string; status: string; action: string; actionValue: string; note: string; verifyCta: string; subject: string }> = {
  es: { greeting: "lamentamos informarte de que tu verificación de identidad ha sido rechazada tras la revisión de nuestro equipo.", title: "Verificación rechazada", status: "Estado", action: "Acción requerida", actionValue: "Debes repetir el proceso de verificación", note: "Mientras tanto, puedes seguir utilizando todas las funcionalidades de MusicDibs excepto el registro de obras. Accede a tu cuenta para completar la verificación de identidad.", verifyCta: "Verificar identidad →", subject: "Verificación de identidad rechazada — MusicDibs" },
  en: { greeting: "we regret to inform you that your identity verification has been rejected after review by our team.", title: "Verification rejected", status: "Status", action: "Required action", actionValue: "You must repeat the verification process", note: "In the meantime, you can continue using all MusicDibs features except work registration. Access your account to complete the identity verification.", verifyCta: "Verify identity →", subject: "Identity verification rejected — MusicDibs" },
  pt: { greeting: "lamentamos informar que sua verificação de identidade foi rejeitada após revisão da nossa equipe.", title: "Verificação rejeitada", status: "Status", action: "Ação necessária", actionValue: "Você deve repetir o processo de verificação", note: "Enquanto isso, você pode continuar usando todas as funcionalidades do MusicDibs, exceto o registro de obras. Acesse sua conta para completar a verificação de identidade.", verifyCta: "Verificar identidade →", subject: "Verificação de identidade rejeitada — MusicDibs" },
};

export function kycRejectedEmail(data: { name: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t6b[lang];
  const safeName = escapeHtml(data.name);
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";
  const statusLabels: Record<Lang, string> = { es: "❌ Rechazada", en: "❌ Rejected", pt: "❌ Rejeitada" };

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(185,28,28,0.12));border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.status, statusLabels[lang])}
      ${infoRow(i.action, i.actionValue)}
    </table>
    <p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.note}</p>
    ${cta("https://musicdibs.com/dashboard/identity", i.verifyCta)}`;

  return { subject: i.subject, html: wrap("🔒", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 7. Payment Failure Notification ────────────────────────────────────────

const t7: Record<Lang, { greeting: string; title: string; detail: string; attempt: string; nextRetry: (d: string) => string; noMore: string; ignore: string; updatePayment: string; subject: string }> = {
  es: { greeting: "no hemos podido procesar el cobro de tu suscripción.", title: "Fallo en el cobro", detail: "Detalle", attempt: "Intento", nextRetry: (d) => `Próximo reintento: <strong style="color:#f3f4f6;">${d}</strong>`, noMore: "No hay más reintentos programados. Actualiza tu método de pago para evitar la cancelación.", ignore: "Si ya has resuelto el problema, puedes ignorar este mensaje.", updatePayment: "Actualizar método de pago →", subject: "⚠️ Fallo en el cobro de tu suscripción — MusicDibs" },
  en: { greeting: "we were unable to process your subscription payment.", title: "Payment failed", detail: "Detail", attempt: "Attempt", nextRetry: (d) => `Next retry: <strong style="color:#f3f4f6;">${d}</strong>`, noMore: "No more retries scheduled. Update your payment method to avoid cancellation.", ignore: "If you've already resolved the issue, you can ignore this message.", updatePayment: "Update payment method →", subject: "⚠️ Subscription payment failed — MusicDibs" },
  pt: { greeting: "não conseguimos processar o pagamento da sua assinatura.", title: "Falha no pagamento", detail: "Detalhe", attempt: "Tentativa", nextRetry: (d) => `Próxima tentativa: <strong style="color:#f3f4f6;">${d}</strong>`, noMore: "Não há mais tentativas programadas. Atualize seu método de pagamento para evitar o cancelamento.", ignore: "Se você já resolveu o problema, pode ignorar esta mensagem.", updatePayment: "Atualizar método de pagamento →", subject: "⚠️ Falha no pagamento da assinatura — MusicDibs" },
};

export function paymentFailedEmail(data: { name: string; description: string; attemptCount: number; nextAttempt: string | null; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t7[lang];
  const safeName = escapeHtml(data.name);
  const safeDesc = escapeHtml(data.description);
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";
  const locale = lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-ES";

  const nextRetryLine = data.nextAttempt
    ? `<p style="margin:12px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.nextRetry(escapeHtml(new Date(data.nextAttempt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })))}</p>`
    : `<p style="margin:12px 0 0;color:#fca5a5;font-size:14px;text-align:center;font-weight:600;">${i.noMore}</p>`;

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(185,28,28,0.12));border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.detail, safeDesc)}
      ${infoRow(i.attempt, `${data.attemptCount}`)}
    </table>
    ${nextRetryLine}
    <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;text-align:center;">${i.ignore}</p>
    ${cta("https://musicdibs.com/dashboard/billing", i.updatePayment)}`;

  return { subject: i.subject, html: wrap("⚠️", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 8a. Premium Promo Approved ─────────────────────────────────────────────

const t8a: Record<Lang, { greeting: string; title: string; artist: string; song: string; note: string; viewPanel: string; subject: string }> = {
  es: { greeting: "¡tu solicitud de Promo Premium ha sido aprobada! 🎉", title: "Promo Premium aprobada", artist: "Artista", song: "Canción", note: "Nuestro equipo está preparando tu promoción. En los próximos días recibirás un aviso cuando se publique en nuestras redes sociales.", viewPanel: "Ver mi panel →", subject: "✅ Promo Premium aprobada — MusicDibs" },
  en: { greeting: "your Premium Promo request has been approved! 🎉", title: "Premium Promo approved", artist: "Artist", song: "Song", note: "Our team is preparing your promotion. You will receive a notification in the coming days when it is published on our social media channels.", viewPanel: "View my dashboard →", subject: "✅ Premium Promo approved — MusicDibs" },
  pt: { greeting: "sua solicitação de Promo Premium foi aprovada! 🎉", title: "Promo Premium aprovada", artist: "Artista", song: "Música", note: "Nossa equipe está preparando sua promoção. Nos próximos dias você receberá um aviso quando for publicada nas nossas redes sociais.", viewPanel: "Ver meu painel →", subject: "✅ Promo Premium aprovada — MusicDibs" },
};

export function premiumPromoApprovedEmail(data: { name: string; artistName: string; songTitle: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t8a[lang];
  const safeName = escapeHtml(data.name);
  const safeArtist = escapeHtml(data.artistName);
  const safeSong = escapeHtml(data.songTitle);
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.12));border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.artist, safeArtist)}
      ${infoRow(i.song, safeSong)}
    </table>
    <p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.note}</p>
    ${cta("https://musicdibs.com/dashboard/promotion", i.viewPanel)}`;

  return { subject: i.subject, html: wrap("✅", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 8b. Premium Promo Published ────────────────────────────────────────────

const t8: Record<Lang, { greeting: string; title: string; artist: string; song: string; note: string; igLabel: string; tiktokLabel: string; viewPanel: string; subject: string }> = {
  es: { greeting: "¡tu Promo Premium ha sido publicada! 🎉", title: "Promo Premium publicada", artist: "Artista", song: "Canción", note: "Nuestro equipo ha publicado tu promoción en los canales de MusicDibs. ¡Compártelo con tu audiencia!", igLabel: "Instagram", tiktokLabel: "TikTok", viewPanel: "Ver mi promoción →", subject: "🎉 Promo Premium publicada — MusicDibs" },
  en: { greeting: "your Premium Promo has been published! 🎉", title: "Premium Promo published", artist: "Artist", song: "Song", note: "Our team has published your promotion on MusicDibs channels. Share it with your audience!", igLabel: "Instagram", tiktokLabel: "TikTok", viewPanel: "View my promotion →", subject: "🎉 Premium Promo published — MusicDibs" },
  pt: { greeting: "sua Promo Premium foi publicada! 🎉", title: "Promo Premium publicada", artist: "Artista", song: "Música", note: "Nossa equipe publicou sua promoção nos canais do MusicDibs. Compartilhe com seu público!", igLabel: "Instagram", tiktokLabel: "TikTok", viewPanel: "Ver minha promoção →", subject: "🎉 Promo Premium publicada — MusicDibs" },
};

export function premiumPromoPublishedEmail(data: { name: string; artistName: string; songTitle: string; igUrl?: string; tiktokUrl?: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t8[lang];
  const safeName = escapeHtml(data.name);
  const safeArtist = escapeHtml(data.artistName);
  const safeSong = escapeHtml(data.songTitle);
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";

  const socialLinks: string[] = [];
  if (data.igUrl) {
    socialLinks.push(infoRow(i.igLabel, `<a href="${escapeHtml(data.igUrl)}" style="color:#a855f7;text-decoration:none;">${escapeHtml(data.igUrl)}</a>`));
  }
  if (data.tiktokUrl) {
    socialLinks.push(infoRow(i.tiktokLabel, `<a href="${escapeHtml(data.tiktokUrl)}" style="color:#a855f7;text-decoration:none;">${escapeHtml(data.tiktokUrl)}</a>`));
  }

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.12));border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.artist, safeArtist)}
      ${infoRow(i.song, safeSong)}
      ${socialLinks.join("")}
    </table>
    <p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.note}</p>
    ${cta("https://musicdibs.com/dashboard/promotion", i.viewPanel)}`;

  return { subject: i.subject, html: wrap("🏆", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 9. Premium Promo Rejected ──────────────────────────────────────────────

const t9: Record<Lang, { greeting: string; title: string; artist: string; song: string; reasonLabel: string; note: string; contactUs: string; subject: string }> = {
  es: { greeting: "lamentamos informarte de que tu solicitud de Promo Premium ha sido rechazada.", title: "Promo Premium rechazada", artist: "Artista", song: "Canción", reasonLabel: "Motivo", note: "Si tienes dudas o quieres enviar una nueva solicitud, no dudes en contactarnos.", contactUs: "Contactar con soporte →", subject: "❌ Promo Premium rechazada — MusicDibs" },
  en: { greeting: "we regret to inform you that your Premium Promo request has been rejected.", title: "Premium Promo rejected", artist: "Artist", song: "Song", reasonLabel: "Reason", note: "If you have any questions or would like to submit a new request, please contact us.", contactUs: "Contact support →", subject: "❌ Premium Promo rejected — MusicDibs" },
  pt: { greeting: "lamentamos informar que sua solicitação de Promo Premium foi rejeitada.", title: "Promo Premium rejeitada", artist: "Artista", song: "Música", reasonLabel: "Motivo", note: "Se tiver dúvidas ou quiser enviar uma nova solicitação, entre em contato conosco.", contactUs: "Entrar em contato →", subject: "❌ Promo Premium rejeitada — MusicDibs" },
};

export function premiumPromoRejectedEmail(data: { name: string; artistName: string; songTitle: string; reason: string; lang?: string }) {
  const lang = normLang(data.lang);
  const i = t9[lang];
  const safeName = escapeHtml(data.name);
  const safeArtist = escapeHtml(data.artistName);
  const safeSong = escapeHtml(data.songTitle);
  const safeReason = escapeHtml(data.reason);
  const greeting = lang === "en" ? "Hi" : lang === "pt" ? "Olá" : "Hola";

  const reasonBlock = safeReason
    ? `<tr>${infoRow(i.reasonLabel, safeReason)}</tr>`
    : "";

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">${greeting} <strong style="color:#f3f4f6;">${safeName}</strong>, ${i.greeting}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(220,38,38,0.12));border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px 24px;margin-bottom:8px;">
      ${infoRow(i.artist, safeArtist)}
      ${infoRow(i.song, safeSong)}
      ${safeReason ? infoRow(i.reasonLabel, safeReason) : ""}
    </table>
    <p style="margin:16px 0 0;color:#d1d5db;font-size:14px;text-align:center;">${i.note}</p>
    ${cta("https://musicdibs.com/contact", i.contactUs)}`;

  return { subject: i.subject, html: wrap("❌", i.title, body, lang), text: `${greeting} ${data.name}, ${i.greeting}` };
}

// ─── 10. Metric Alert Notification (Admin) ───────────────────────────────────

export function metricAlertEmail(data: { alerts: Array<{ title: string; description: string; severity: string }> }) {
  const alertRows = data.alerts.map(a => {
    const icon = a.severity === "critical" ? "🔴" : "🟡";
    const color = a.severity === "critical"
      ? "rgba(239,68,68,0.12)"
      : "rgba(245,158,11,0.12)";
    const borderColor = a.severity === "critical"
      ? "rgba(239,68,68,0.25)"
      : "rgba(245,158,11,0.25)";
    return `<div style="background:linear-gradient(135deg,${color},${color});border:1px solid ${borderColor};border-radius:12px;padding:16px 20px;margin-bottom:12px;">
      <p style="margin:0 0 6px;color:#f3f4f6;font-size:14px;font-weight:600;">${icon} ${escapeHtml(a.title)}</p>
      <p style="margin:0;color:#d1d5db;font-size:13px;line-height:1.5;">${escapeHtml(a.description)}</p>
    </div>`;
  }).join("");

  const critCount = data.alerts.filter(a => a.severity === "critical").length;
  const warnCount = data.alerts.filter(a => a.severity === "warning").length;
  const summary = critCount > 0
    ? `${critCount} alerta${critCount > 1 ? "s" : ""} crítica${critCount > 1 ? "s" : ""}${warnCount > 0 ? ` y ${warnCount} aviso${warnCount > 1 ? "s" : ""}` : ""}`
    : `${warnCount} aviso${warnCount > 1 ? "s" : ""}`;

  const body = `
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;line-height:1.7;text-align:center;">
      Se han detectado <strong style="color:#f3f4f6;">${summary}</strong> en las métricas de MusicDibs que requieren atención.
    </p>
    ${alertRows}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
      Esta notificación no se repetirá en los próximos 7 días si las alertas persisten.
    </p>
    ${cta("https://musicdibs.com/dashboard/admin/metrics", "Ver dashboard de métricas →")}`;

  const subjectPrefix = critCount > 0 ? "🚨" : "⚠️";
  return {
    subject: `${subjectPrefix} Alertas métricas MusicDibs — ${summary}`,
    html: wrap("📊", "Alertas de Métricas", body, "es"),
    text: `Se han detectado ${summary} en las métricas de MusicDibs. Revisa el dashboard: https://musicdibs.com/dashboard/admin/metrics`,
  };
}
