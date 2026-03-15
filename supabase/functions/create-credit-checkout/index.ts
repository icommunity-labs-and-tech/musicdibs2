import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { planChangeEmail } from "../_shared/transactional-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, { priceId: string; credits: number; mode: "subscription" | "payment"; signupFeePriceId?: string }> = {
  annual: {
    priceId: "price_1T9TnyF9ZCIiqrz6ruOlBcnZ",
    credits: 120,
    mode: "subscription",
  },
  monthly: {
    priceId: "price_1T9SZvF9ZCIiqrz6TWLtfMBs",
    credits: 3,
    mode: "subscription",
    signupFeePriceId: "price_1T9Sa1F9ZCIiqrz6cGm2fiwn",
  },
  individual: {
    priceId: "price_1T9TnyF9ZCIiqrz6XqgzLo1K",
    credits: 1,
    mode: "payment",
  },
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1T9TnyF9ZCIiqrz6ruOlBcnZ": "annual",
  "price_1T9SZvF9ZCIiqrz6TWLtfMBs": "monthly",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CREDIT-CHECKOUT] ${step}${detailsStr}`);
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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { planId } = await req.json();
    const plan = PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // For subscriptions, check if user already has an active one
    if (plan.mode === "subscription" && customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length > 0) {
        const currentSub = subs.data[0];
        const currentPriceId = currentSub.items.data[0]?.price?.id;
        const currentPlanId = currentPriceId ? PRICE_TO_PLAN[currentPriceId] : null;

        // If user is trying to subscribe to the same plan, block it
        if (currentPlanId === planId) {
          throw new Error("Ya estás suscrito a este plan.");
        }

        const currentRank = currentPlanId === "annual" ? 2 : 1;
        const targetRank = planId === "annual" ? 2 : 1;
        const isUpgrade = targetRank > currentRank;

        const planNameMap: Record<string, string> = { annual: "Annual", monthly: "Monthly" };
        const newPlanName = planNameMap[planId] || planId;

        if (isUpgrade) {
          // UPGRADE: charge prorated difference immediately, add new credits
          logStep("Upgrading subscription", { from: currentPlanId, to: planId });
          await stripe.subscriptions.update(currentSub.id, {
            items: [{ id: currentSub.items.data[0].id, price: plan.priceId }],
            proration_behavior: "create_prorations",
          });

          // Get current credits and ADD the new plan's credits
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("available_credits")
            .eq("user_id", user.id)
            .single();
          const currentCredits = profile?.available_credits ?? 0;
          const updatedCredits = currentCredits + plan.credits;

          await supabaseAdmin.from("profiles").update({
            subscription_plan: newPlanName,
            available_credits: updatedCredits,
          }).eq("user_id", user.id);

          await supabaseAdmin.from("credit_transactions").insert({
            user_id: user.id,
            amount: plan.credits,
            type: "plan_change",
            description: `Upgrade a ${newPlanName}: +${plan.credits} créditos añadidos`,
          });

          logStep("Upgrade completed", { newPlan: newPlanName, addedCredits: plan.credits, totalCredits: updatedCredits });

          // Send plan change email
          try {
            const displayName = user.user_metadata?.display_name || user.email!.split("@")[0];
            const oldPlanName = currentPlanId === "annual" ? "Anual" : "Mensual";
            const email = planChangeEmail({
              name: displayName, oldPlan: oldPlanName, newPlan: newPlanName,
              isUpgrade: true, creditsAdded: plan.credits,
            });
            const messageId = crypto.randomUUID();
            await supabaseAdmin.from("email_send_log").insert({
              message_id: messageId, template_name: "plan_change", recipient_email: user.email!, status: "pending",
            });
            await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                run_id: crypto.randomUUID(), message_id: messageId,
                to: user.email!, from: "MusicDibs <noreply@notify.musicdibs.com>",
                sender_domain: "notify.musicdibs.com",
                subject: email.subject, html: email.html, text: email.text,
                purpose: "transactional", label: "plan_change",
                queued_at: new Date().toISOString(),
              },
            });
            logStep("Plan change email enqueued", { email: user.email });
          } catch (emailErr) {
            console.error("[CREATE-CREDIT-CHECKOUT] Error enqueuing plan change email:", emailErr);
          }

          return new Response(JSON.stringify({
            switched: true,
            plan: newPlanName,
            message: `Upgrade a ${newPlanName}. Se han añadido ${plan.credits} créditos.`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } else {
          // DOWNGRADE: no charge, change takes effect at next billing period, keep current credits
          logStep("Downgrading subscription", { from: currentPlanId, to: planId });
          await stripe.subscriptions.update(currentSub.id, {
            items: [{ id: currentSub.items.data[0].id, price: plan.priceId }],
            proration_behavior: "none",
          });

          // Only update the plan name, do NOT touch credits
          await supabaseAdmin.from("profiles").update({
            subscription_plan: newPlanName,
          }).eq("user_id", user.id);

          await supabaseAdmin.from("credit_transactions").insert({
            user_id: user.id,
            amount: 0,
            type: "plan_change",
            description: `Downgrade a ${newPlanName}: los créditos actuales se mantienen hasta fin de periodo`,
          });

          logStep("Downgrade completed", { newPlan: newPlanName });

          return new Response(JSON.stringify({
            switched: true,
            plan: newPlanName,
            message: `Cambio a ${newPlanName}. Tus créditos actuales se mantienen hasta fin de periodo.`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    // Build line items for new checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: plan.priceId, quantity: 1 },
    ];

    // For monthly plan, check if this is a new customer (needs signup fee)
    if (plan.signupFeePriceId && customerId) {
      const allSubs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
      if (allSubs.data.length === 0) {
        lineItems.push({ price: plan.signupFeePriceId, quantity: 1 });
      }
    } else if (plan.signupFeePriceId && !customerId) {
      lineItems.push({ price: plan.signupFeePriceId, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: plan.mode,
      success_url: `${req.headers.get("origin")}/dashboard/credits?payment=success&plan=${planId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dashboard/credits?payment=canceled`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        credits: String(plan.credits),
      },
    });

    // Guardar stripe_customer_id en profiles si aún no lo tiene
    const resolvedCustomerId = session.customer as string | undefined;
    if (resolvedCustomerId && user.id) {
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: resolvedCustomerId })
        .eq("user_id", user.id)
        .is("stripe_customer_id", null); // solo si no lo tiene ya
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
