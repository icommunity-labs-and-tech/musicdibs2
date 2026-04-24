import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function executeAccountDeletion(
  admin: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
  reason: string,
  additionalFeedback: string | null,
  planType: string | null,
  creditsRemaining: number,
) {
  const errors: string[] = [];

  // 1. Save cancellation survey
  try {
    await admin.from("cancellation_surveys").insert({
      user_id: userId,
      reason,
      additional_feedback: additionalFeedback || null,
      plan_type: planType,
      credits_remaining: creditsRemaining,
      is_account_deletion: true,
    });
  } catch (e) {
    errors.push(`cancellation_survey: ${e}`);
  }

  // 2. Cancel Stripe subscription if exists
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (profile?.stripe_customer_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "active",
        });
        for (const sub of subs.data) {
          await stripe.subscriptions.update(sub.id, {
            cancel_at_period_end: true,
            metadata: { cancelled_reason: "account_deletion" },
          });
          console.log(`[DELETE-ACCOUNT] Cancelled subscription ${sub.id}`);
        }
      }
    }
  } catch (e) {
    errors.push(`stripe_cancel: ${e}`);
    console.error("[DELETE-ACCOUNT] Stripe cancel error:", e);
  }

  // 3. Anonymize works with blockchain_hash
  try {
    await admin
      .from("works")
      .update({ user_id: null, author: "Usuario eliminado", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .not("blockchain_hash", "is", null);
  } catch (e) {
    errors.push(`anonymize_works: ${e}`);
  }

  // 4. Anonymize orders
  try {
    await admin.from("orders").update({ user_id: null }).eq("user_id", userId);
  } catch (e) {
    errors.push(`anonymize_orders: ${e}`);
  }

  // 5. Anonymize purchase_evidences
  try {
    await admin.from("purchase_evidences").update({ user_id: null }).eq("user_id", userId);
  } catch (e) {
    errors.push(`anonymize_purchase_evidences: ${e}`);
  }

  // 6. Anonymize purchase_usage_evidences
  try {
    await admin.from("purchase_usage_evidences").update({ user_id: null }).eq("user_id", userId);
  } catch (e) {
    errors.push(`anonymize_purchase_usage_evidences: ${e}`);
  }

  // 7. Delete personal data and assets (order matters for FK constraints)
  const deleteTables = [
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
    "managed_works",
    "managed_artists",
    "ibs_signatures",
    "user_roles",
    "cancellation_tracking",
    "credit_transactions",
  ];

  for (const table of deleteTables) {
    try {
      if (table === "managed_works" || table === "managed_artists") {
        await admin.from(table).delete().eq("manager_user_id", userId);
      } else {
        await admin.from(table).delete().eq("user_id", userId);
      }
    } catch (e) {
      errors.push(`delete_${table}: ${e}`);
      console.error(`[DELETE-ACCOUNT] Failed to delete from ${table}:`, e);
    }
  }

  // Delete ibs_sync_queue (only non-resolved)
  try {
    await admin.from("ibs_sync_queue").delete().eq("user_id", userId).neq("status", "resolved");
  } catch (e) {
    errors.push(`delete_ibs_sync_queue: ${e}`);
  }

  // Delete works without blockchain_hash
  try {
    await admin.from("works").delete().eq("user_id", userId).is("blockchain_hash", null);
  } catch (e) {
    errors.push(`delete_works_no_blockchain: ${e}`);
  }

  // Delete cancellation_surveys (keep the deletion one, remove old ones)
  try {
    await admin.from("cancellation_surveys").delete().eq("user_id", userId).eq("is_account_deletion", false);
  } catch (e) {
    errors.push(`delete_old_cancellation_surveys: ${e}`);
  }

  // Delete profile last
  try {
    await admin.from("profiles").delete().eq("user_id", userId);
  } catch (e) {
    errors.push(`delete_profiles: ${e}`);
  }

  // 8. Audit log
  try {
    await admin.from("audit_log").insert({
      admin_user_id: userId,
      admin_email: userEmail,
      action: "account_deleted",
      target_user_id: userId,
      target_email: userEmail,
      details: { reason, plan_type: planType, errors: errors.length > 0 ? errors : undefined },
    });
  } catch (e) {
    console.error("[DELETE-ACCOUNT] Failed to write audit log:", e);
  }

  // Mark the deletion survey as completed
  try {
    await admin
      .from("cancellation_surveys")
      .update({ account_deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_account_deletion", true);
  } catch (e) {
    console.error("[DELETE-ACCOUNT] Failed to mark survey:", e);
  }

  // 9. Delete auth user
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch (e) {
    errors.push(`delete_auth_user: ${e}`);
    console.error("[DELETE-ACCOUNT] Failed to delete auth user:", e);
  }

  return { errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { reason, additional_feedback } = await req.json();
    if (!reason || typeof reason !== "string" || reason.trim().length < 2) {
      return json({ error: "reason is required" }, 400);
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
      .single();

    const { errors } = await executeAccountDeletion(
      admin,
      user.id,
      user.email || "",
      reason.trim(),
      additional_feedback || null,
      profile?.subscription_plan || null,
      profile?.available_credits || 0,
    );

    if (errors.length > 0) {
      console.warn("[DELETE-ACCOUNT] Completed with errors:", errors);
    }

    return json({ success: true, deletedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[DELETE-ACCOUNT] Error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

export { executeAccountDeletion };
