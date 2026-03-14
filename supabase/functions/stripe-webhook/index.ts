import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_CREDITS: Record<string, number> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": 120, // annual
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": 3,   // monthly
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret || !sig) {
      console.error("[WEBHOOK] Missing webhook secret or signature");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured or signature missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const event: Stripe.Event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    // ── checkout.session.completed ──────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId   = session.metadata?.user_id;
      const credits  = parseInt(session.metadata?.credits || "0", 10);
      const planId   = session.metadata?.plan_id || "unknown";

      if (userId && credits > 0) {
        await addCredits(supabase, userId, credits, `Compra plan ${planId}: +${credits} créditos`);

        const planMap: Record<string, string> = { annual: "Annual", monthly: "Monthly" };
        const planName = planMap[planId];
        if (planName) {
          await supabase
            .from("profiles")
            .update({ subscription_plan: planName })
            .eq("user_id", userId);
          console.log(`[WEBHOOK] Updated subscription_plan to ${planName} for user ${userId}`);
        }

        // Guardar stripe_customer_id para evitar listUsers() en futuros eventos
        if (session.customer) {
          const customerId = typeof session.customer === "string"
            ? session.customer
            : session.customer.id;
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("user_id", userId);
          console.log(`[WEBHOOK] Saved stripe_customer_id ${customerId} for user ${userId}`);
        }
      }
    }

    // ── invoice.payment_succeeded (renovaciones) ────────────────────────
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === "subscription_cycle") {
        const customerId = invoice.customer as string;

        // Lookup directo por stripe_customer_id — sin listUsers()
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, available_credits")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const priceId  = invoice.lines?.data?.[0]?.price?.id;
          const credits  = priceId ? (PRICE_CREDITS[priceId] || 0) : 0;

          if (credits > 0) {
            await supabase
              .from("profiles")
              .update({ available_credits: credits })
              .eq("user_id", profile.user_id);

            await supabase.from("credit_transactions").insert({
              user_id:     profile.user_id,
              amount:      credits,
              type:        "renewal",
              description: `Renovación de suscripción: créditos reiniciados a ${credits}`,
            });
            console.log(`[WEBHOOK] Reset credits to ${credits} for user ${profile.user_id} (renewal)`);
          }
        } else {
          // Fallback: stripe_customer_id no está guardado aún (usuarios anteriores)
          // Intentar buscar por email una sola vez y guardar el customer_id para el futuro
          console.warn(`[WEBHOOK] No profile found for customer ${customerId} — trying email fallback`);
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          if (customer.email) {
            const { data: authUser } = await supabase.auth.admin.getUserByEmail(customer.email);
            if (authUser?.user) {
              const priceId = invoice.lines?.data?.[0]?.price?.id;
              const credits = priceId ? (PRICE_CREDITS[priceId] || 0) : 0;
              if (credits > 0) {
                await supabase
                  .from("profiles")
                  .update({
                    available_credits: credits,
                    stripe_customer_id: customerId, // guardar para el futuro
                  })
                  .eq("user_id", authUser.user.id);
                await supabase.from("credit_transactions").insert({
                  user_id:     authUser.user.id,
                  amount:      credits,
                  type:        "renewal",
                  description: `Renovación (fallback email): créditos reiniciados a ${credits}`,
                });
                console.log(`[WEBHOOK] Fallback renewal OK for ${authUser.user.id}, customer_id saved`);
              }
            }
          }
        }
      }
    }

    // ── customer.subscription.deleted (cancelación) ─────────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId   = subscription.customer as string;

      // Lookup directo por stripe_customer_id — sin listUsers()
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ subscription_plan: "Free" })
          .eq("user_id", profile.user_id);
        console.log(`[WEBHOOK] Reset to Free for user ${profile.user_id} (cancellation)`);
      } else {
        // Fallback para usuarios anteriores sin stripe_customer_id
        console.warn(`[WEBHOOK] No profile found for customer ${customerId} — trying email fallback`);
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (customer.email) {
          const { data: authUser } = await supabase.auth.admin.getUserByEmail(customer.email);
          if (authUser?.user) {
            await supabase
              .from("profiles")
              .update({
                subscription_plan: "Free",
                stripe_customer_id: customerId, // guardar para el futuro
              })
              .eq("user_id", authUser.user.id);
            console.log(`[WEBHOOK] Fallback cancellation OK for ${authUser.user.id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WEBHOOK] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

async function addCredits(supabase: any, userId: string, credits: number, description: string) {
  await supabase.from("credit_transactions").insert({
    user_id:     userId,
    amount:      credits,
    type:        "purchase",
    description,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("available_credits")
    .eq("user_id", userId)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ available_credits: profile.available_credits + credits })
      .eq("user_id", userId);
  }

  console.log(`[WEBHOOK] Added ${credits} credits to user ${userId}`);
}
