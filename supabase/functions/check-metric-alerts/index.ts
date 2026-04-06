import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { metricAlertEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_DAYS = 7;
const PLAN_PRICES: Record<string, number> = { Free: 0, Starter: 4.99, Pro: 9.99, Business: 19.99, Enterprise: 49.99 };

interface AlertItem {
  key: string;
  title: string;
  description: string;
  severity: "critical" | "warning";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const now = new Date();

    // ── Collect metrics ──────────────────────────────────────────────────

    // Profiles
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: newUsersThisMonth } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart);

    // Stripe metrics
    let stripeMrr = 0;
    let activeSubsCount = 0;
    let cancelledThisMonth = 0;
    let totalRevenue = 0;
    let churnRate = 0;
    let annualRevenue = 0;
    let monthlyRevenue = 0;
    let ltvCacRatio = 0;
    let ltv = 0;
    let cac = 50; // default
    let grossMargin = 85; // default
    let runway = 0;
    let burnRate = 0;
    let cashBalance = 0;
    let nrr = 100;
    let quickRatio = 0;
    let conversionRate = 0;
    let mrrChange = 0;

    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });

      // Active subs
      const allSubs: any[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;
      while (hasMore) {
        const params: any = { status: "active", limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        const batch = await stripe.subscriptions.list(params);
        allSubs.push(...batch.data);
        hasMore = batch.has_more;
        if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
      }
      activeSubsCount = allSubs.length;

      for (const sub of allSubs) {
        for (const item of sub.items.data) {
          const price = item.price;
          const unitAmount = (price.unit_amount || 0) / 100;
          const interval = price.recurring?.interval;
          const monthlyAmount = interval === "year" ? unitAmount / 12 : unitAmount;
          stripeMrr += monthlyAmount;
          if (interval === "year") annualRevenue += monthlyAmount;
          else monthlyRevenue += monthlyAmount;
        }
      }

      // Cancelled this month
      const cancelledSubs = await stripe.subscriptions.list({
        status: "canceled",
        limit: 100,
        created: { gte: Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000) },
      });
      cancelledThisMonth = cancelledSubs.data.length;

      // Churn
      const base = activeSubsCount + cancelledThisMonth;
      churnRate = base > 0 ? parseFloat(((cancelledThisMonth / base) * 100).toFixed(1)) : 0;

      // Revenue this month
      const charges = await stripe.charges.list({
        limit: 100,
        created: { gte: Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000) },
      });
      totalRevenue = charges.data.filter((c: any) => c.status === "succeeded").reduce((s: number, c: any) => s + c.amount / 100, 0);

      // MRR change
      const lastMonthStart = Math.floor(new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime() / 1000);
      const lastMonthEnd = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
      const lastCharges = await stripe.charges.list({ limit: 100, created: { gte: lastMonthStart, lt: lastMonthEnd } });
      const lastMonthRev = lastCharges.data.filter((c: any) => c.status === "succeeded").reduce((s: number, c: any) => s + c.amount / 100, 0);
      mrrChange = lastMonthRev > 0 ? parseFloat((((totalRevenue - lastMonthRev) / lastMonthRev) * 100).toFixed(1)) : 0;
    }

    // Paid users count
    const paidPlans = ["Starter", "Pro", "Business", "Enterprise", "Annual"];
    const { count: paidUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).in("subscription_plan", paidPlans);
    conversionRate = (totalUsers || 0) > 0 ? parseFloat((((paidUsers || 0) / (totalUsers || 0)) * 100).toFixed(1)) : 0;

    // Marketing metrics
    const { data: mktData } = await supabase.from("marketing_metrics")
      .select("*")
      .eq("year", now.getFullYear())
      .eq("month", now.getMonth() + 1)
      .maybeSingle();

    if (mktData) {
      const adSpend = Number(mktData.ad_spend) || 0;
      const cogs = Number(mktData.cogs) || 0;
      cashBalance = Number(mktData.cash_balance) || 0;
      burnRate = Number(mktData.monthly_burn) || 0;
      cac = (newUsersThisMonth || 0) > 0 ? Math.round(adSpend / (newUsersThisMonth || 1)) : 50;
      grossMargin = totalRevenue > 0 ? parseFloat((((totalRevenue - cogs) / totalRevenue) * 100).toFixed(1)) : 85;
      runway = burnRate > 0 ? Math.round(cashBalance / burnRate) : 0;
    }

    // LTV & ratios
    const arpu = (paidUsers || 0) > 0 ? parseFloat((stripeMrr / (paidUsers || 1)).toFixed(2)) : 0;
    ltv = churnRate > 0 ? Math.round(arpu / (churnRate / 100)) : Math.round(arpu * 24);
    ltvCacRatio = cac > 0 ? parseFloat((ltv / cac).toFixed(1)) : 0;
    const paybackPeriod = arpu > 0 ? Math.round(cac / arpu) : 0;
    nrr = activeSubsCount > 0 ? Math.round(((stripeMrr + annualRevenue - monthlyRevenue * (churnRate / 100)) / stripeMrr) * 100) : 100;
    quickRatio = cancelledThisMonth > 0 ? parseFloat(((newUsersThisMonth || 0) / cancelledThisMonth).toFixed(1)) : (newUsersThisMonth || 0) > 0 ? 10 : 0;

    // ── Evaluate alerts ──────────────────────────────────────────────────

    const alerts: AlertItem[] = [];

    // Runway
    if (runway > 0 && runway < 12) {
      alerts.push({ key: "runway_critical", severity: "critical", title: `Runway crítico: ${runway} meses`, description: "El runway está por debajo de 12 meses. Considerar reducir burn rate, acelerar revenue o iniciar ronda de financiación." });
    }

    // CAC > LTV
    if (cac > 0 && ltv > 0 && cac > ltv) {
      alerts.push({ key: "cac_exceeds_ltv", severity: "critical", title: `CAC (€${cac}) supera LTV (€${ltv})`, description: "Cada nuevo usuario cuesta más de lo que genera. Revisar canales de adquisición, mejorar retención o subir pricing." });
    }

    // Churn > 10%
    if (churnRate > 10) {
      alerts.push({ key: "churn_critical", severity: "critical", title: `Churn rate elevado: ${churnRate}%`, description: "Un churn >10% mensual es insostenible. Analizar cohortes, activar encuestas de salida y mejorar onboarding." });
    }

    // Gross Margin < 60%
    if (grossMargin < 60 && grossMargin > 0) {
      alerts.push({ key: "gross_margin_critical", severity: "critical", title: `Gross Margin bajo: ${grossMargin}%`, description: "El margen bruto está muy por debajo del benchmark SaaS (>70%). Revisar COGS y costes de infraestructura." });
    }

    // Quick Ratio < 1
    if (quickRatio > 0 && quickRatio < 1) {
      alerts.push({ key: "quick_ratio_critical", severity: "critical", title: `Quick Ratio < 1 (${quickRatio}x)`, description: "Se pierde más MRR del que se gana. El negocio está en contracción neta." });
    }

    // MRR declining > 10%
    if (mrrChange < -10) {
      alerts.push({ key: "mrr_decline_critical", severity: "critical", title: `MRR en caída: ${mrrChange}% MoM`, description: "El MRR cae más de un 10% respecto al mes anterior. Analizar cancelaciones y pipeline." });
    }

    // LTV:CAC < 3
    if (ltvCacRatio > 0 && ltvCacRatio < 3 && !(cac > ltv)) {
      alerts.push({ key: "ltv_cac_warning", severity: "warning", title: `LTV:CAC ratio bajo (${ltvCacRatio}x)`, description: "El ratio ideal es ≥3x. Optimizar CAC o incrementar LTV." });
    }

    // Churn 5-10%
    if (churnRate > 5 && churnRate <= 10) {
      alerts.push({ key: "churn_warning", severity: "warning", title: `Churn rate alto: ${churnRate}%`, description: "El churn ideal para SaaS B2C es <5%. Investigar causas de cancelación." });
    }

    // NRR < 100%
    if (nrr < 100 && nrr > 0) {
      alerts.push({ key: "nrr_warning", severity: "warning", title: `NRR por debajo del 100% (${nrr}%)`, description: "El revenue de cohortes existentes se contrae." });
    }

    // Runway 12-18
    if (runway >= 12 && runway < 18) {
      alerts.push({ key: "runway_warning", severity: "warning", title: `Runway bajo: ${runway} meses`, description: "El runway está entre 12-18 meses. Planificar próxima ronda con antelación." });
    }

    // Payback > 18m
    if (paybackPeriod > 18) {
      alerts.push({ key: "payback_warning", severity: "warning", title: `Payback period largo: ${paybackPeriod} meses`, description: "Ideal <12m. Reducir CAC o aumentar ARPU." });
    }

    // Conversion < 2%
    if (conversionRate < 2 && (totalUsers || 0) > 50) {
      alerts.push({ key: "conversion_warning", severity: "warning", title: `Conversión Free→Paid baja: ${conversionRate}%`, description: "Tasa de conversión inferior al 2%. Revisar pricing y trial experience." });
    }

    console.log(`[check-metric-alerts] Evaluated ${alerts.length} alerts`);

    if (alerts.length === 0) {
      // Clear all resolved alerts
      await supabase.from("metric_alert_notifications")
        .update({ resolved_at: now.toISOString() })
        .is("resolved_at", null);

      return new Response(JSON.stringify({ message: "No alerts triggered", alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check cooldown ───────────────────────────────────────────────────

    const cooldownCutoff = new Date(now.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await supabase.from("metric_alert_notifications")
      .select("alert_key, notified_at")
      .is("resolved_at", null)
      .gte("notified_at", cooldownCutoff);

    const recentKeys = new Set((recentNotifs || []).map((n: any) => n.alert_key));
    const newAlerts = alerts.filter(a => !recentKeys.has(a.key));

    // Mark alerts that are no longer firing as resolved
    const activeKeys = new Set(alerts.map(a => a.key));
    const { data: allActive } = await supabase.from("metric_alert_notifications")
      .select("id, alert_key")
      .is("resolved_at", null);
    
    for (const notif of (allActive || [])) {
      if (!activeKeys.has(notif.alert_key)) {
        await supabase.from("metric_alert_notifications")
          .update({ resolved_at: now.toISOString() })
          .eq("id", notif.id);
      }
    }

    if (newAlerts.length === 0) {
      console.log(`[check-metric-alerts] All ${alerts.length} alerts within cooldown, skipping email`);
      return new Response(JSON.stringify({ message: "All alerts within cooldown", alerts: alerts.length, skipped: alerts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Send email to admins ─────────────────────────────────────────────

    // Get admin emails
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (!adminRoles || adminRoles.length === 0) {
      console.log("[check-metric-alerts] No admin users found");
      return new Response(JSON.stringify({ message: "No admins found", alerts: newAlerts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin emails from auth
    const adminEmails: string[] = [];
    for (const role of adminRoles) {
      const { data: userData } = await supabase.auth.admin.getUserById(role.user_id);
      if (userData?.user?.email) adminEmails.push(userData.user.email);
    }

    // Build email
    const email = metricAlertEmail({ alerts: newAlerts });
    const messageId = `metric-alerts-${now.toISOString().slice(0, 10)}-${Date.now()}`;

    // Send to each admin
    for (const adminEmail of adminEmails) {
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "metric_alerts",
        recipient_email: adminEmail,
        status: "pending",
      });

      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: adminEmail,
          subject: email.subject,
          html: email.html,
          text: email.text,
          message_id: messageId,
        },
      });
    }

    // Record notifications
    for (const alert of newAlerts) {
      await supabase.from("metric_alert_notifications").upsert({
        alert_key: alert.key,
        alert_title: alert.title,
        alert_description: alert.description,
        notified_at: now.toISOString(),
        resolved_at: null,
      }, { onConflict: "alert_key" });
    }

    console.log(`[check-metric-alerts] Sent ${newAlerts.length} alerts to ${adminEmails.length} admins`);

    return new Response(JSON.stringify({
      message: "Alerts sent",
      alertsSent: newAlerts.length,
      adminsNotified: adminEmails.length,
      alertKeys: newAlerts.map(a => a.key),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[check-metric-alerts] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
