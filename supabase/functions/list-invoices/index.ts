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

    // Get stripe_customer_id from profile
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

    // Parse optional params
    let limit = 20;
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 100);
    } catch {
      // no body, use defaults
    }

    const mapped: any[] = [];

    // 1. Fetch invoices (from subscriptions) if customer exists
    if (customerId) {
      const invoices = await stripe.invoices.list({ customer: customerId, limit });

      for (const inv of invoices.data) {
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

      // 2. Fetch one-time charges associated with customer
      const charges = await stripe.charges.list({ customer: customerId, limit });

      const invoiceChargeIds = new Set(
        mapped.map((inv: any) => inv.id).filter(Boolean)
      );

      // Collect charge IDs already represented by invoices
      const invoicesData = await stripe.invoices.list({ customer: customerId, limit: 100 });
      const invoiceChargeIdSet = new Set(
        invoicesData.data.map((inv: any) => inv.charge).filter(Boolean)
      );

      for (const ch of charges.data) {
        if (invoiceChargeIdSet.has(ch.id)) continue;
        if (ch.status !== "succeeded" && ch.status !== "failed") continue;

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

    // 3. Also fetch completed checkout sessions by email (catches payments without customer)
    // This is critical for users who bought credits before having a Stripe customer
    const checkoutSessions = await stripe.checkout.sessions.list({
      customer_email: user.email!,
      status: "complete",
      limit,
    });

    // Also check sessions by customer ID
    let customerSessions: any[] = [];
    if (customerId) {
      const csSessions = await stripe.checkout.sessions.list({
        customer: customerId,
        status: "complete",
        limit,
      });
      customerSessions = csSessions.data;
    }

    // Merge sessions, dedup by ID
    const allSessions = [...checkoutSessions.data];
    const sessionIds = new Set(allSessions.map(s => s.id));
    for (const cs of customerSessions) {
      if (!sessionIds.has(cs.id)) {
        allSessions.push(cs);
        sessionIds.add(cs.id);
      }
    }

    // Existing mapped IDs to avoid duplicates
    const existingIds = new Set(mapped.map((m: any) => m.id));

    for (const session of allSessions) {
      if (session.mode !== "payment") continue;
      if (!session.payment_intent) continue;

      // Skip if we already have this via invoices/charges
      const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;

      // Fetch the payment intent to get receipt_url from charge
      let receiptUrl: string | null = null;
      let chargeAmount = session.amount_total || 0;
      let chargeCurrency = session.currency || "eur";
      let chargeCreated = Math.floor(new Date(session.created * 1000).getTime() / 1000);
      let chargeStatus: string = "paid";

      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        // Check if this charge is already in our mapped list
        if (pi.latest_charge) {
          const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
          if (existingIds.has(chargeId)) continue;
          existingIds.add(chargeId);

          // Fetch charge for receipt_url
          const charge = await stripe.charges.retrieve(chargeId);
          receiptUrl = charge.receipt_url || null;
          chargeAmount = charge.amount;
          chargeCurrency = charge.currency;
          chargeCreated = charge.created;
          chargeStatus = charge.status === "succeeded" ? "paid" : "failed";
        }
      } catch {
        // If we can't fetch PI, skip
        continue;
      }

      const desc = session.metadata?.plan_id
        ? `Compra ${session.metadata.plan_id}`
        : "Pago único";

      mapped.push({
        id: piId,
        number: null,
        status: chargeStatus,
        amount_due: chargeAmount,
        amount_paid: chargeStatus === "paid" ? chargeAmount : 0,
        currency: chargeCurrency,
        created: chargeCreated,
        period_start: chargeCreated,
        period_end: chargeCreated,
        hosted_invoice_url: receiptUrl,
        invoice_pdf: receiptUrl,
        receipt_url: receiptUrl,
        description: desc,
        payment_type: "one_time",
      });
    }

    // Sort by date descending
    mapped.sort((a: any, b: any) => b.created - a.created);

    // Trim to limit
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
