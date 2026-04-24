import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY")!;
const MAILERLITE_API_URL = "https://connect.mailerlite.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Group IDs by locale and plan ──────────────────────────────────────────
const MAILERLITE_GROUPS: Record<string, Record<string, string>> = {
  es: {
    registrados: "180552557100270838",
    mensuales: "179653836933170957",
    anuales: "179655929185175246",
    single: "179655957217805955",
    baja: "180549266623694014",
    cart_abandoned: "184043608840602848",
  },
  en: {
    registrados: "180552563766068699",
    mensuales: "179655903760353011",
    anuales: "179655937992165159",
    single: "179655967666865903",
    baja: "180549280191218751",
    cart_abandoned: "184043614299489447",
  },
  "pt-br": {
    registrados: "180552569505974164",
    mensuales: "179655918471874176",
    anuales: "179655947115824759",
    single: "179655975825835602",
    baja: "180549290870965583",
    cart_abandoned: "184043618346992923",
  },
};

function normalizeLocale(locale: string | null | undefined): "es" | "en" | "pt-br" {
  if (!locale) return "en";
  const lower = locale.toLowerCase();
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("pt") || lower.startsWith("br")) return "pt-br";
  return "en";
}

async function callMailerLite(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<any> {
  const url = `${MAILERLITE_API_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${MAILERLITE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const errText = await res.text();
    console.error(`[ML] ${method} ${endpoint} → ${res.status}: ${errText}`);
    // Return parsed error for caller to handle gracefully
    if (res.status === 422) {
      let parsed: any = {};
      try { parsed = JSON.parse(errText); } catch (_) {}
      return { _error: true, status: 422, body: parsed, subscriber: parsed.subscriber };
    }
    throw new Error(`MailerLite API ${res.status}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return { success: true };
  }
  return res.json();
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function handleUserSignup(p: any) {
  const locale = normalizeLocale(p.locale);
  const groupId = MAILERLITE_GROUPS[locale].registrados;
  console.log(`[ML:signup] ${p.email} → locale=${locale} group=${groupId}`);

  const sub = await callMailerLite("POST", "/subscribers", {
    email: p.email,
    fields: {
      name: p.full_name || "",
      user_id: p.id || "",
      locale,
      signup_date: new Date().toISOString().slice(0, 10),
      plan_type: "free",
      kyc_verified: false,
      works_registered: 0,
      credits_balance: 0,
      last_activity_date: new Date().toISOString().slice(0, 10),
    },
    groups: [groupId],
    status: "active",
  });
  console.log(`[ML:signup] ✅ id=${sub.data?.id}`);
  return { subscriber_id: sub.data?.id };
}

async function handlePurchase(p: any) {
  const locale = normalizeLocale(p.locale);
  const oldGroup = MAILERLITE_GROUPS[locale].registrados;
  const newGroup = MAILERLITE_GROUPS[locale][p.plan_type];
  const email = encodeURIComponent(p.email);
  console.log(`[ML:purchase] ${p.email} → plan=${p.plan_type}`);

  // Remove from registrados and baja groups (best-effort)
  for (const gKey of ["registrados", "baja"]) {
    try {
      await callMailerLite("DELETE", `/subscribers/${email}/groups/${MAILERLITE_GROUPS[locale][gKey]}`);
    } catch (_) { /* may not be in group */ }
  }

  // Add to plan group
  if (newGroup) {
    await callMailerLite("POST", `/subscribers/${email}/groups/${newGroup}`, {});
  }

  // Update fields
  await callMailerLite("PUT", `/subscribers/${email}`, {
    fields: {
      plan_type: p.plan_type,
      cart_plan: "subscription",
      stripe_customer_id: p.stripe_customer_id || "",
      last_activity_date: new Date().toISOString().slice(0, 10),
    },
  });
  console.log(`[ML:purchase] ✅`);
  return { success: true };
}

async function handleCancellation(p: any) {
  const locale = normalizeLocale(p.locale);
  const oldGroup = MAILERLITE_GROUPS[locale][p.plan_type];
  const bajaGroup = MAILERLITE_GROUPS[locale].baja;
  const email = encodeURIComponent(p.email);
  console.log(`[ML:cancel] ${p.email} → plan=${p.plan_type}`);

  // Remove from plan group
  if (oldGroup) {
    try {
      await callMailerLite("DELETE", `/subscribers/${email}/groups/${oldGroup}`);
    } catch (_) { /* may not be in group */ }
  }

  // Add to "Baja suscripción" group
  if (bajaGroup) {
    try {
      await callMailerLite("POST", `/subscribers/${email}/groups/${bajaGroup}`, {});
      console.log(`[ML:cancel] Added to baja group`);
    } catch (e) {
      console.warn(`[ML:cancel] Could not add to baja group: ${(e as Error).message}`);
    }
  }

  // Update fields
  await callMailerLite("PUT", `/subscribers/${email}`, {
    fields: {
      plan_type: "free",
      cart_plan: "no_subscription",
      cancellation_date: new Date().toISOString().slice(0, 10),
      cancellation_reason: p.cancellation_reason || "unknown",
    },
  });
  console.log(`[ML:cancel] ✅`);
  return { success: true };
}

async function handleActivityUpdate(p: any) {
  const email = encodeURIComponent(p.email);
  console.log(`[ML:activity] ${p.email}`, p.updates);
  await callMailerLite("PUT", `/subscribers/${email}`, { fields: p.updates });
  console.log(`[ML:activity] ✅`);
  return { success: true };
}

async function handleCartAbandoned(p: any) {
  const locale = normalizeLocale(p.locale);
  const cartGroup = MAILERLITE_GROUPS[locale].cart_abandoned;
  console.log(`[ML:cart_abandoned] ${p.email} → plan=${p.plan_type}, amount=${p.amount}, locale=${locale}`);

  const cartFields = {
    cart_abandoned: "true",
    cart_plan: p.plan_type || "unknown",
    cart_amount: p.amount || "0",
    cart_currency: p.currency || "EUR",
    cart_date: new Date().toISOString().slice(0, 10),
  };

  // Try upsert via POST first
  const sub = await callMailerLite("POST", `/subscribers`, {
    email: p.email,
    fields: cartFields,
    groups: [cartGroup],
  });

  // If subscriber is unsubscribed (422), try PUT to update fields only
  if (sub?._error && sub.status === 422) {
    const errMsg = sub.body?.errors?.email?.[0] || "";
    if (errMsg.includes("unsubscribed")) {
      console.warn(`[ML:cart_abandoned] Subscriber ${p.email} is unsubscribed, updating fields via PUT`);
      const email = encodeURIComponent(p.email);
      await callMailerLite("PUT", `/subscribers/${email}`, { fields: cartFields });
      // Try to add to group (best-effort, may fail for unsubscribed)
      try {
        await callMailerLite("POST", `/subscribers/${email}/groups/${cartGroup}`, {});
      } catch (_) { /* unsubscribed users can't be added to groups */ }
      console.log(`[ML:cart_abandoned] ✅ updated fields for unsubscribed user`);
      return { success: true };
    }
    // Other 422 error — throw
    throw new Error(`MailerLite API 422: ${JSON.stringify(sub.body)}`);
  }

  console.log(`[ML:cart_abandoned] ✅ assigned to group ${cartGroup}`);
  return { success: true };
}

// ── Main ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event, ...payload } = await req.json();
    console.log(`[ML] Event: ${event}`);

    let result: any;
    switch (event) {
      case "user.created":
        result = await handleUserSignup(payload);
        break;
      case "purchase.completed":
        result = await handlePurchase(payload);
        break;
      case "subscription.cancelled":
        result = await handleCancellation(payload);
        break;
      case "activity.updated":
        result = await handleActivityUpdate(payload);
        break;
      case "cart.abandoned":
        result = await handleCartAbandoned(payload);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown event: ${event}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[ML] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
