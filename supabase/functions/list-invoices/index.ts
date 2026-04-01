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

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const user = userData.user;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fallback: search by email
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    let limit = 20;
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 100);
    } catch {
      // no body
    }

    const mapped: any[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch invoices (from subscriptions) if customer exists
    if (customerId) {
      const invoices = await stripe.invoices.list({ customer: customerId, limit });

      for (const inv of invoices.data) {
        seenIds.add(inv.id);
        if (inv.charge) seenIds.add(typeof inv.charge === "string" ? inv.charge : inv.charge.id);
        mapped.push({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount_due: inv.amount_due,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          created: inv.created,
          period_start: inv.period_start,
          period_end: inv.period_end,
          hosted_invoice_url: inv.hosted_invoice_url,
          invoice_pdf: inv.invoice_pdf,
          description: inv.description || inv.lines?.data?.[0]?.description || null,
          payment_type: "subscription",
        });
      }

      // 2. Fetch one-time charges for customer
      const charges = await stripe.charges.list({ customer: customerId, limit });

      for (const ch of charges.data) {
        if (seenIds.has(ch.id)) continue;
        if (ch.status !== "succeeded" && ch.status !== "failed") continue;
        seenIds.add(ch.id);

        mapped.push({
          id: ch.id,
          number: null,
          status: ch.status === "succeeded" ? "paid" : "failed",
          amount_due: ch.amount,
          amount_paid: ch.status === "succeeded" ? ch.amount : 0,
          currency: ch.currency,
          created: ch.created,
          period_start: ch.created,
          period_end: ch.created,
          hosted_invoice_url: ch.receipt_url || null,
          invoice_pdf: ch.receipt_url || null,
          receipt_url: ch.receipt_url || null,
          description: ch.description || (ch.metadata?.plan_id ? `Compra ${ch.metadata.plan_id}` : "Pago único"),
          payment_type: "one_time",
        });
      }
    }

    // 3. Search for payment-mode checkout sessions by user_id in metadata
    // This catches payments made without a Stripe customer association
    try {
      const sessions = await stripe.checkout.sessions.search({
        query: `metadata["user_id"]:"${user.id}" AND mode:"payment" AND status:"complete"`,
        limit,
      });

      for (const session of sessions.data) {
        const piId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
        
        if (!piId || seenIds.has(piId)) continue;

        try {
          const pi = await stripe.paymentIntents.retrieve(piId);
          const chargeId = typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id;

          if (chargeId && seenIds.has(chargeId)) continue;
          if (chargeId) seenIds.add(chargeId);
          seenIds.add(piId);

          let receiptUrl: string | null = null;
          let amount = pi.amount || 0;
          let currency = pi.currency || "eur";
          let created = pi.created;

          if (chargeId) {
            try {
              const charge = await stripe.charges.retrieve(chargeId);
              receiptUrl = charge.receipt_url || null;
              amount = charge.amount;
              currency = charge.currency;
              created = charge.created;
            } catch { /* ignore */ }
          }

          const desc = session.metadata?.plan_id
            ? `Compra ${session.metadata.plan_id}`
            : "Pago único";

          mapped.push({
            id: chargeId || piId,
            number: null,
            status: pi.status === "succeeded" ? "paid" : "failed",
            amount_due: amount,
            amount_paid: pi.status === "succeeded" ? amount : 0,
            currency,
            created,
            period_start: created,
            period_end: created,
            hosted_invoice_url: receiptUrl,
            invoice_pdf: receiptUrl,
            receipt_url: receiptUrl,
            description: desc,
            payment_type: "one_time",
          });
        } catch {
          // Skip this session if PI retrieval fails
        }
      }
    } catch (searchErr) {
      console.error("[LIST-INVOICES] Checkout search error:", searchErr);
    }

    // Sort by date descending
    mapped.sort((a: any, b: any) => b.created - a.created);

    const trimmed = mapped.slice(0, limit);

    return new Response(
      JSON.stringify({ invoices: trimmed, has_more: mapped.length > limit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[LIST-INVOICES] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
