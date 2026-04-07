import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("Not authenticated");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("[VERIFY-PAYMENT] Session:", JSON.stringify({
      id: session.id,
      status: session.payment_status,
      mode: session.mode,
      metadata: session.metadata,
    }));

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ fulfilled: false, reason: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaUserId = session.metadata?.user_id;
    if (metaUserId !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    const planId = session.metadata?.plan_id || "unknown";
    const CREDITS_MAP: Record<string, number> = {
      annual_100: 100, annual_200: 200, annual_300: 300, annual_500: 500, annual_1000: 1000,
      monthly: 8, individual: 1,
      topup_10: 10, topup_25: 25, topup_50: 50, topup_100: 100, topup_200: 200,
    };
    const credits = CREDITS_MAP[planId] ?? (session.metadata?.credits ? parseInt(session.metadata.credits, 10) : 0);

    if (credits <= 0) {
      return new Response(JSON.stringify({ fulfilled: false, reason: "no_credits" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already fulfilled (idempotency) — look for existing transaction with this session ID
    const { data: existing } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "purchase")
      .ilike("description", `%${session.id}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("[VERIFY-PAYMENT] Already fulfilled:", session.id);
      return new Response(JSON.stringify({ fulfilled: true, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add credits
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", user.id)
      .single();

    const currentCredits = profile?.available_credits ?? 0;

    await supabaseAdmin.from("profiles").update({
      available_credits: currentCredits + credits,
    }).eq("user_id", user.id);

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      amount: credits,
      type: "purchase",
      description: `Compra ${planId}: +${credits} crédito(s) [${session.id}]`,
    });

    // For subscription plans, update the plan name
    const ANNUAL_PLAN_IDS = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
    const planMap: Record<string, string> = { monthly: "Monthly" };
    if (ANNUAL_PLAN_IDS.includes(planId)) planMap[planId] = "Annual";
    const planName = planMap[planId];
    if (planName) {
      await supabaseAdmin.from("profiles").update({ subscription_plan: planName }).eq("user_id", user.id);
    }

    console.log(`[VERIFY-PAYMENT] Fulfilled: +${credits} credits for user ${user.id} (session ${session.id})`);

    // ── Distribution onboarding notification (fallback if stripe-webhook missed it) ──
    const ANNUAL_IDS = ["annual_100", "annual_200", "annual_300", "annual_500", "annual_1000"];
    if (ANNUAL_IDS.includes(planId)) {
      // Check previous plan BEFORE this purchase (we already updated it above, so check credit_transactions for prior annual purchases)
      const { data: priorAnnual } = await supabaseAdmin
        .from("credit_transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "purchase")
        .like("description", "Compra annual_%")
        .limit(2);

      // Only notify if this is the FIRST annual purchase (the one we just inserted)
      const isFirstAnnual = !priorAnnual || priorAnnual.length <= 1;

      if (isFirstAnnual) {
        const displayName = user.user_metadata?.display_name || user.email;
        const userEmail = user.email || "unknown";
        const distMsgId = crypto.randomUUID();

        // 1) Internal notification to marketing team
        const distHtml = `<h2>🎵 Nuevo alta en Distribución</h2><p>Un usuario ha contratado su primera suscripción anual y necesita ser dado de alta en la plataforma de distribución.</p><table style="border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px 12px;font-weight:bold;">Usuario:</td><td style="padding:6px 12px;">${displayName}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${userEmail}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Plan:</td><td style="padding:6px 12px;">${planId}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">Créditos:</td><td style="padding:6px 12px;">${credits}</td></tr><tr><td style="padding:6px 12px;font-weight:bold;">User ID:</td><td style="padding:6px 12px;">${user.id}</td></tr></table><p>👉 <a href="https://musicdibs.sonosuite.com/">Dar de alta en Sonosuite</a></p>`;

        try {
          await supabaseAdmin.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              to: "marketing@musicdibs.com",
              cc: "info@musicdibs.com",
              subject: "Nuevo alta en Distribución",
              html: distHtml,
              purpose: "transactional",
              idempotency_key: `dist-onboard-${user.id}-${planId}`,
              message_id: distMsgId,
            },
          });
          console.log(`[VERIFY-PAYMENT] ✅ Distribution onboarding email enqueued for ${userEmail}`);
        } catch (e) {
          console.warn("[VERIFY-PAYMENT] Distribution onboarding email failed:", e);
        }

        // 2) User-facing email: distribution access within 72h
        const userMsgId = crypto.randomUUID();
        const lang = user.user_metadata?.language || "es";
        const userName = displayName !== userEmail ? displayName : "";

        const subjectByLang: Record<string, string> = {
          es: "Tu acceso a distribución está en camino 🎶",
          en: "Your distribution access is on its way 🎶",
          pt: "Seu acesso à distribuição está a caminho 🎶",
        };
        const userSubject = subjectByLang[lang] || subjectByLang["es"];

        const greetingByLang: Record<string, string> = {
          es: userName ? `¡Hola ${userName}!` : "¡Hola!",
          en: userName ? `Hi ${userName}!` : "Hi!",
          pt: userName ? `Olá ${userName}!` : "Olá!",
        };

        const bodyByLang: Record<string, string> = {
          es: `<h2>${greetingByLang["es"]}</h2>
<p>¡Enhorabuena por activar tu suscripción anual! 🎉</p>
<p>Estamos preparando tu cuenta en nuestra plataforma de distribución para que puedas llevar tu música a todas las tiendas digitales (Spotify, Apple Music, Amazon Music, y muchas más).</p>
<p><strong>En un plazo máximo de 72 horas</strong> recibirás un correo electrónico con las instrucciones para generar tu contraseña y acceder a la plataforma de distribución.</p>
<p>El proceso de alta requiere una configuración manual por parte de nuestro equipo para garantizar que todo esté correctamente vinculado a tu cuenta.</p>
<p>Si tienes alguna pregunta mientras tanto, no dudes en escribirnos a <a href="mailto:info@musicdibs.com">info@musicdibs.com</a>.</p>
<p>¡Gracias por confiar en MusicDibs!</p>
<p>— El equipo de MusicDibs</p>`,
          en: `<h2>${greetingByLang["en"]}</h2>
<p>Congratulations on activating your annual subscription! 🎉</p>
<p>We are setting up your account on our distribution platform so you can get your music on all major digital stores (Spotify, Apple Music, Amazon Music, and more).</p>
<p><strong>Within a maximum of 72 hours</strong> you will receive an email with instructions to create your password and access the distribution platform.</p>
<p>The onboarding process requires manual setup by our team to ensure everything is properly linked to your account.</p>
<p>If you have any questions in the meantime, feel free to reach out at <a href="mailto:info@musicdibs.com">info@musicdibs.com</a>.</p>
<p>Thank you for trusting MusicDibs!</p>
<p>— The MusicDibs Team</p>`,
          pt: `<h2>${greetingByLang["pt"]}</h2>
<p>Parabéns por ativar sua assinatura anual! 🎉</p>
<p>Estamos preparando sua conta em nossa plataforma de distribuição para que você possa levar sua música a todas as lojas digitais (Spotify, Apple Music, Amazon Music e muito mais).</p>
<p><strong>Em um prazo máximo de 72 horas</strong> você receberá um e-mail com as instruções para gerar sua senha e acessar a plataforma de distribuição.</p>
<p>O processo de integração requer uma configuração manual por parte da nossa equipe para garantir que tudo esteja corretamente vinculado à sua conta.</p>
<p>Se tiver alguma dúvida, não hesite em nos escrever em <a href="mailto:info@musicdibs.com">info@musicdibs.com</a>.</p>
<p>Obrigado por confiar na MusicDibs!</p>
<p>— A equipe MusicDibs</p>`,
        };
        const userHtml = bodyByLang[lang] || bodyByLang["es"];

        try {
          await supabaseAdmin.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              to: userEmail,
              subject: userSubject,
              html: userHtml,
              purpose: "transactional",
              idempotency_key: `dist-welcome-${user.id}-${planId}`,
              message_id: userMsgId,
            },
          });
          console.log(`[VERIFY-PAYMENT] ✅ Distribution welcome email enqueued for ${userEmail}`);
        } catch (e) {
          console.warn("[VERIFY-PAYMENT] Distribution welcome email failed:", e);
        }
      }
    }

    return new Response(JSON.stringify({ fulfilled: true, credits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[VERIFY-PAYMENT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
