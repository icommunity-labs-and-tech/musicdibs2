import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Core deletion logic — used both by user self-service and admin force-delete.
 * Runs with service_role client. Does NOT abort on non-critical errors.
 */
export async function executeAccountDeletion(
  admin: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
  reason: string,
  planType: string,
  creditsRemaining: number,
  isAdminForce = false,
  adminUserId?: string,
  adminEmail?: string,
) {
  const errors: string[] = [];

  // 1. Save cancellation survey
  try {
    await admin.from("cancellation_surveys").insert({
      user_id: userId,
      reason,
      plan_type: planType,
      credits_remaining: creditsRemaining,
    });
  } catch (e) {
    errors.push(`cancellation_surveys: ${e}`);
  }

  // 2. Cancel Stripe subscription if exists
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const { data: profile } = await admin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.stripe_customer_id) {
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "active",
          limit: 10,
        });
        for (const sub of subs.data) {
          await stripe.subscriptions.update(sub.id, {
            cancel_at_period_end: true,
          });
        }
      }
    }
  } catch (e) {
    errors.push(`stripe_cancel: ${e}`);
  }

  // 3. Anonymize works with blockchain_hash (keep record, remove identity)
  try {
    await admin
      .from("works")
      .update({ user_id: null, author: "Usuario eliminado", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .not("blockchain_hash", "is", null);
  } catch (e) {
    errors.push(`anonymize_works: ${e}`);
  }

  // 4. Delete works WITHOUT blockchain_hash (no legal obligation to keep)
  try {
    await admin.from("works").delete().eq("user_id", userId).is("blockchain_hash", null);
  } catch (e) {
    errors.push(`delete_works: ${e}`);
  }

  // 5. Anonymize orders
  try {
    await admin.from("orders").update({ user_id: null }).eq("user_id", userId);
  } catch (e) {
    errors.push(`anonymize_orders: ${e}`);
  }

  // 6. Anonymize purchase_evidences
  try {
    await admin.from("purchase_evidences").update({ user_id: null }).eq("user_id", userId);
  } catch (e) {
    errors.push(`anonymize_purchase_evidences: ${e}`);
  }

  // 7. Anonymize purchase_usage_evidences
  try {
    await admin.from("purchase_usage_evidences").update({ user_id: null }).eq("user_id", userId);
  } catch (e) {
    errors.push(`anonymize_purchase_usage_evidences: ${e}`);
  }

  // 8. Delete personal data and assets (order matters for FK constraints)
  const tablesToDelete = [
    "voice_clones",
    "ai_generations",
    "lyrics_generations",
    "social_promotions",
    "premium_social_promotions",
    "press_releases",
    "video_generations",
    "auphonic_productions",
    "user_artist_profiles",
    "user_attribution",
    "audiomack_connections",
    "audiomack_metrics",
    "product_events",
    "notification_log",
    "ai_rate_limits",
    "promotion_requests",
    "ibs_signatures",
    "cancellation_tracking",
    "cancellation_surveys",
    "credit_transactions",
    "user_roles",
    "managed_works",
    "managed_artists",
    "profiles",
  ];

  for (const table of tablesToDelete) {
    try {
      if (table === "managed_works" || table === "managed_artists") {
        await admin.from(table).delete().eq("manager_user_id", userId);
      } else {
        await admin.from(table).delete().eq("user_id", userId);
      }
    } catch (e) {
      errors.push(`delete_${table}: ${e}`);
    }
  }

  // Also delete ibs_sync_queue
  try {
    await admin.from("ibs_sync_queue").delete().eq("user_id", userId);
  } catch (e) {
    errors.push(`delete_ibs_sync_queue: ${e}`);
  }

  // 9. Delete auth user
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch (e) {
    errors.push(`delete_auth_user: ${e}`);
  }

  // 10. Audit log
  try {
    await admin.from("audit_log").insert({
      admin_user_id: isAdminForce ? (adminUserId || userId) : userId,
      admin_email: isAdminForce ? (adminEmail || userEmail) : userEmail,
      action: isAdminForce ? "force_account_deleted" : "account_deleted",
      target_user_id: userId,
      target_email: userEmail,
      details: { reason, plan_type: planType, errors: errors.length > 0 ? errors : undefined },
    });
  } catch (e) {
    console.error("[DELETE-ACCOUNT] Failed to write audit log:", e);
  }

  return { errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) return json({ error: "No autorizado" }, 401);

    const { reason, additional_comments, confirm_email } = await req.json();

    if (!reason) return json({ error: "El motivo es obligatorio" }, 400);
    if (!confirm_email || confirm_email.toLowerCase() !== (user.email || "").toLowerCase()) {
      return json({ error: "El email de confirmación no coincide" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get profile info before deletion
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_plan, available_credits")
      .eq("user_id", user.id)
      .maybeSingle();

    const planType = profile?.subscription_plan || "Free";
    const creditsRemaining = profile?.available_credits || 0;
    const fullReason = additional_comments ? `${reason} — ${additional_comments}` : reason;

    const { errors } = await executeAccountDeletion(
      admin,
      user.id,
      user.email || "",
      fullReason,
      planType,
      creditsRemaining,
    );

    if (errors.length > 0) {
      console.error("[DELETE-ACCOUNT] Partial errors:", errors);
    }

    return json({
      success: true,
      deletedAt: new Date().toISOString(),
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("[DELETE-ACCOUNT] Fatal error:", e);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
