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
      if (customers.data.length === 0) {
        return new Response(JSON.stringify({ invoices: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerId = customers.data[0].id;
    }

    // Parse optional params
    let limit = 20;
    let startingAfter: string | undefined;
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 100);
      if (body.starting_after) startingAfter = body.starting_after;
    } catch {
      // no body, use defaults
    }

    // Fetch invoices (from subscriptions)
    const invoiceParams: any = { customer: customerId, limit };
    if (startingAfter && startingAfter.startsWith("in_")) invoiceParams.starting_after = startingAfter;

    const invoices = await stripe.invoices.list(invoiceParams);

    const mapped: any[] = invoices.data.map((inv: any) => ({
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
    }));

    // Also fetch one-time charges (from payment-mode checkout sessions)
    const chargeParams: any = { customer: customerId, limit };
    if (startingAfter && startingAfter.startsWith("ch_")) chargeParams.starting_after = startingAfter;

    const charges = await stripe.charges.list(chargeParams);

    // Filter out charges that are already represented by invoices
    const invoiceChargeIds = new Set(
      invoices.data.map((inv: any) => inv.charge).filter(Boolean)
    );

    for (const ch of charges.data) {
      if (invoiceChargeIds.has(ch.id)) continue; // skip duplicates
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
      });
    }

    // Sort by date descending
    mapped.sort((a: any, b: any) => b.created - a.created);

    // Trim to limit
    const trimmed = mapped.slice(0, limit);
    const combinedHasMore = invoices.has_more || charges.has_more || mapped.length > limit;

    return new Response(
      JSON.stringify({ invoices: trimmed, has_more: combinedHasMore }),
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
