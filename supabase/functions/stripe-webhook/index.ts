import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map price IDs to credit amounts for subscription renewals
const PRICE_CREDITS: Record<string, number> = {
  "price_1T8n6CFULeu7PzK6vs7NZyiJ": 120, // annual
  "price_1T8n6lFULeu7PzK60TbO76hE": 3,   // monthly
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

    let event: Stripe.Event;
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const credits = parseInt(session.metadata?.credits || "0", 10);
      const planId = session.metadata?.plan_id || "unknown";

      if (userId && credits > 0) {
        await addCredits(supabase, userId, credits, `Compra plan ${planId}: +${credits} créditos`);
        
        // Update subscription plan
        const planMap: Record<string, string> = { annual: "Annual", monthly: "Monthly" };
        const planName = planMap[planId];
        if (planName) {
          await supabase.from("profiles").update({ subscription_plan: planName }).eq("user_id", userId);
          console.log(`[WEBHOOK] Updated subscription_plan to ${planName} for user ${userId}`);
        }
      }
    }

    // Handle subscription renewals — reset credits to plan amount
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      // Only handle renewal invoices (not the first one which is handled by checkout.session.completed)
      if (invoice.billing_reason === "subscription_cycle") {
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email;
        
        if (email) {
          // Find user by email
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users?.users?.find((u: any) => u.email === email);
          
          if (user) {
            // Find credits from the subscription price
            const priceId = invoice.lines?.data?.[0]?.price?.id;
            const credits = priceId ? (PRICE_CREDITS[priceId] || 0) : 0;
            
            if (credits > 0) {
              // Reset credits to the plan amount (old unused credits are lost)
              await supabase
                .from("profiles")
                .update({ available_credits: credits })
                .eq("user_id", user.id);
              
              await supabase.from("credit_transactions").insert({
                user_id: user.id,
                amount: credits,
                type: "renewal",
                description: `Renovación de suscripción: créditos reiniciados a ${credits}`,
              });
              
              console.log(`[WEBHOOK] Reset credits to ${credits} for user ${user.id} (renewal)`);
            }
          }
        }
      }
    }

    // Handle subscription cancellation — reset plan to Free
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const email = customer.email;

      if (email) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users?.find((u: any) => u.email === email);

        if (user) {
          await supabase.from("profiles").update({ subscription_plan: "Free" }).eq("user_id", user.id);
          console.log(`[WEBHOOK] Reset subscription_plan to Free for user ${user.id} (cancellation)`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WEBHOOK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function addCredits(supabase: any, userId: string, credits: number, description: string) {
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: credits,
    type: "purchase",
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
