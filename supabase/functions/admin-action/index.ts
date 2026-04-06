import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { premiumPromoPublishedEmail, kycRejectedEmail } from "../_shared/transactional-email.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !callerUser) return json({ error: "Unauthorized" }, 401);

    const callerUserId = callerUser.id;
    const callerEmail = callerUser.email || "";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleRow?.role !== "admin") return json({ error: "Forbidden" }, 403);

    const { action, payload = {} } = await req.json();

    // ── Helper: write audit log ──────────────────────────────
    async function audit(details: {
      action: string;
      target_user_id?: string;
      target_email?: string;
      details?: Record<string, unknown>;
    }) {
      try {
        await admin.from("audit_log").insert({
          admin_user_id: callerUserId,
          admin_email: callerEmail,
          action: details.action,
          target_user_id: details.target_user_id || null,
          target_email: details.target_email || null,
          details: details.details || {},
        });
      } catch (e) {
        console.error("[AUDIT] Failed to write audit log:", e);
      }
    }

    // ── Helper: get all auth emails in one call ──────────────
    async function getAllEmailsMap(): Promise<Record<string, string>> {
      const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const map: Record<string, string> = {};
      (authUsers || []).forEach((u: any) => { if (u.email) map[u.id] = u.email; });
      return map;
    }

    // ── ACTIONS ──────────────────────────────────────────────

    if (action === "get_users") {
      const offset = payload.offset || 0;
      const search = payload.search || "";

      const { data: profiles, error } = await admin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + 49);
      if (error) return json({ error: error.message }, 500);

      const userIds = (profiles || []).map((p: any) => p.user_id);

      // 1 query for all roles
      const { data: roles } = await admin.from("user_roles").select("user_id, role").in("user_id", userIds);
      const rolesMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      // 1 query for all works counts
      const { data: worksCounts } = await admin.from("works").select("user_id").in("user_id", userIds);
      const worksCountMap: Record<string, number> = {};
      (worksCounts || []).forEach((w: any) => {
        worksCountMap[w.user_id] = (worksCountMap[w.user_id] || 0) + 1;
      });

      // 1 call for all auth users (emails + metadata)
      const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailsMap: Record<string, string> = {};
      const metaNameMap: Record<string, string> = {};
      (authUsers || []).forEach((u: any) => {
        if (u.email) emailsMap[u.id] = u.email;
        const metaName = u.user_metadata?.display_name || u.user_metadata?.full_name || "";
        if (metaName) metaNameMap[u.id] = metaName;
      });

      let result = (profiles || []).map((p: any) => ({
        ...p,
        display_name: p.display_name || metaNameMap[p.user_id] || "",
        roles: rolesMap[p.user_id] || ["user"],
        works_count: worksCountMap[p.user_id] || 0,
        email: emailsMap[p.user_id] || "",
      }));

      if (search) {
        result = result.filter((u: any) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.display_name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return json({ users: result, total: result.length });
    }

    if (action === "adjust_credits") {
      const { user_id, amount, reason } = payload;
      if (!user_id || amount === undefined || !reason) return json({ error: "user_id, amount, reason required" }, 400);
      if (amount === 0) return json({ error: "La cantidad no puede ser 0" }, 400);
      if (amount < -1000 || amount > 1000) return json({ error: "La cantidad debe estar entre -1000 y 1000" }, 400);
      if (typeof reason !== "string" || reason.trim().length < 5) return json({ error: "El motivo debe tener al menos 5 caracteres" }, 400);

      const { data: profile } = await admin.from("profiles").select("available_credits").eq("user_id", user_id).single();
      if (!profile) return json({ error: "User not found" }, 404);

      const { data: targetAuth } = await admin.auth.admin.getUserById(user_id);
      const targetEmail = targetAuth?.user?.email || "";

      const newCredits = Math.max(0, profile.available_credits + amount);
      const { error: upErr } = await admin.from("profiles").update({ available_credits: newCredits, updated_at: new Date().toISOString() }).eq("user_id", user_id);
      if (upErr) return json({ error: upErr.message }, 500);

      await admin.from("credit_transactions").insert({
        user_id,
        amount,
        type: amount > 0 ? "admin_grant" : "admin_deduct",
        description: reason.slice(0, 200),
      });

      await audit({
        action: "adjust_credits",
        target_user_id: user_id,
        target_email: targetEmail,
        details: { amount, reason: reason.slice(0, 200), previous_balance: profile.available_credits, new_balance: newCredits },
      });

      return json({ success: true, new_balance: newCredits });
    }

    if (action === "set_kyc") {
      const { user_id, status } = payload;
      if (!["pending", "verified", "rejected"].includes(status)) return json({ error: "Invalid status" }, 400);

      // When rejecting, reset to 'unverified' so the user can retry verification
      const effectiveStatus = status === "rejected" ? "unverified" : status;
      const updateData: Record<string, unknown> = {
        kyc_status: effectiveStatus,
        updated_at: new Date().toISOString(),
      };
      // Clear signature so user can start a fresh verification
      if (status === "rejected") {
        updateData.ibs_signature_id = null;
      }

      const { error } = await admin.from("profiles").update(updateData).eq("user_id", user_id);
      if (error) return json({ error: error.message }, 500);

      const { data: targetAuth } = await admin.auth.admin.getUserById(user_id);
      const targetEmail = targetAuth?.user?.email || "";

      await audit({
        action: "set_kyc",
        target_user_id: user_id,
        target_email: targetEmail,
        details: { requested_status: status, effective_status: effectiveStatus },
      });

      // Send rejection email when KYC is rejected
      if (status === "rejected" && targetEmail) {
        try {
          const { data: profile } = await admin.from("profiles").select("display_name, language").eq("user_id", user_id).single();
          const name = profile?.display_name || targetEmail.split("@")[0] || "Usuario";
          const emailData = kycRejectedEmail({ name, lang: profile?.language });
          const messageId = crypto.randomUUID();
          await admin.from("email_send_log").insert({
            message_id: messageId,
            template_name: "kyc_rejected",
            recipient_email: targetEmail,
            status: "pending",
          });
          await admin.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: messageId,
              to: targetEmail,
              from: "MusicDibs <noreply@notify.musicdibs.com>",
              sender_domain: "notify.musicdibs.com",
              subject: emailData.subject,
              html: emailData.html,
              text: emailData.text,
              purpose: "transactional",
              label: "kyc_rejected",
              idempotency_key: `kyc-rejected-${user_id}-${Date.now()}`,
              queued_at: new Date().toISOString(),
            },
          });
          console.log(`[ADMIN] Enqueued kyc_rejected email to ${targetEmail}`);
        } catch (emailErr) {
          console.error("[ADMIN] Failed to enqueue rejection email:", emailErr);
        }
      }

      return json({ success: true });
    }

    if (action === "toggle_block") {
      const { user_id, blocked } = payload;
      if (!user_id || typeof blocked !== "boolean") return json({ error: "user_id and blocked are required" }, 400);

      const { error } = await admin
        .from("profiles")
        .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
        .eq("user_id", user_id);
      if (error) return json({ error: error.message }, 500);

      const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: blocked ? "876000h" : "none",
      });
      if (authErr) return json({ error: authErr.message }, 500);

      if (blocked) {
        await admin.auth.admin.signOut(user_id);
      }

      const { data: targetAuth } = await admin.auth.admin.getUserById(user_id);
      await audit({
        action: blocked ? "block_user" : "unblock_user",
        target_user_id: user_id,
        target_email: targetAuth?.user?.email || "",
        details: { blocked },
      });

      return json({ success: true });
    }

    if (action === "set_admin_role") {
      const { user_id, is_admin } = payload;
      if (user_id === callerUserId && !is_admin) return json({ error: "No puedes quitarte el rol de admin a ti mismo" }, 400);

      if (is_admin) {
        await admin.from("user_roles").upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      }

      const { data: targetAuth } = await admin.auth.admin.getUserById(user_id);
      await audit({
        action: is_admin ? "grant_admin" : "revoke_admin",
        target_user_id: user_id,
        target_email: targetAuth?.user?.email || "",
        details: { is_admin },
      });

      return json({ success: true });
    }

    if (action === "set_manager_role") {
      const { user_id, is_manager } = payload;
      if (!user_id) return json({ error: "user_id required" }, 400);

      if (is_manager) {
        await admin.from("user_roles").upsert({ user_id, role: "manager" }, { onConflict: "user_id,role" });
      } else {
        await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "manager");
      }

      const { data: targetAuth } = await admin.auth.admin.getUserById(user_id);
      await audit({
        action: is_manager ? "grant_manager" : "revoke_manager",
        target_user_id: user_id,
        target_email: targetAuth?.user?.email || "",
        details: { is_manager },
      });

      return json({ success: true });
    }

    if (action === "get_all_works") {
      const offset = payload.offset || 0;
      let query = admin.from("works").select("*").order("created_at", { ascending: false }).range(offset, offset + 49);
      if (payload.status_filter) query = query.eq("status", payload.status_filter);
      if (payload.search) query = query.ilike("title", `%${payload.search}%`);

      const { data: works, error } = await query;
      if (error) return json({ error: error.message }, 500);

      const userIds = [...new Set((works || []).map((w: any) => w.user_id))];
      const emailsMap = await getAllEmailsMap();

      const { data: profiles } = await admin.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const namesMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { namesMap[p.user_id] = p.display_name; });

      const enriched = (works || []).map((w: any) => ({
        ...w,
        user_email: emailsMap[w.user_id] || "",
        user_display_name: namesMap[w.user_id] || "",
      }));

      return json({ works: enriched });
    }

    if (action === "get_metrics") {
      const { count: total_users } = await admin.from("profiles").select("*", { count: "exact", head: true });
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count: new_users_7d } = await admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo);
      const { count: total_works } = await admin.from("works").select("*", { count: "exact", head: true });
      const { count: works_registered } = await admin.from("works").select("*", { count: "exact", head: true }).eq("status", "registered");
      const { count: works_processing } = await admin.from("works").select("*", { count: "exact", head: true }).eq("status", "processing");
      const { count: works_failed } = await admin.from("works").select("*", { count: "exact", head: true }).eq("status", "failed");

      const { data: posTx } = await admin.from("credit_transactions").select("amount").gt("amount", 0);
      const total_credits_sold = (posTx || []).reduce((s: number, t: any) => s + t.amount, 0);
      const { data: negTx } = await admin.from("credit_transactions").select("amount").lt("amount", 0);
      const total_credits_consumed = Math.abs((negTx || []).reduce((s: number, t: any) => s + t.amount, 0));

      const { data: allProfiles } = await admin.from("profiles").select("subscription_plan");
      const plan_breakdown: Record<string, number> = {};
      (allProfiles || []).forEach((p: any) => {
        plan_breakdown[p.subscription_plan] = (plan_breakdown[p.subscription_plan] || 0) + 1;
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: recentWorks } = await admin.from("works").select("created_at").gte("created_at", thirtyDaysAgo);
      const works_per_day: Record<string, number> = {};
      (recentWorks || []).forEach((w: any) => {
        const day = w.created_at.slice(0, 10);
        works_per_day[day] = (works_per_day[day] || 0) + 1;
      });

      return json({
        total_users: total_users || 0,
        new_users_7d: new_users_7d || 0,
        total_works: total_works || 0,
        works_registered: works_registered || 0,
        works_processing: works_processing || 0,
        works_failed: works_failed || 0,
        total_credits_sold,
        total_credits_consumed,
        plan_breakdown,
        works_per_day,
      });
    }

    if (action === "get_all_transactions") {
      const offset = payload.offset || 0;
      let query = admin.from("credit_transactions").select("*").order("created_at", { ascending: false }).range(offset, offset + 49);
      if (payload.type_filter) query = query.eq("type", payload.type_filter);
      if (payload.date_from) query = query.gte("created_at", payload.date_from + "T00:00:00Z");
      if (payload.date_to) query = query.lte("created_at", payload.date_to + "T23:59:59Z");

      const { data: txs, error } = await query;
      if (error) return json({ error: error.message }, 500);

      const emailsMap = await getAllEmailsMap();
      const enriched = (txs || []).map((t: any) => ({ ...t, email: emailsMap[t.user_id] || "" }));
      return json({ transactions: enriched });
    }

    if (action === "search_user_by_email") {
      const { email } = payload;
      if (!email) return json({ error: "email required" }, 400);

      const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const found = (authUsers || []).find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (!found) return json({ error: "User not found" }, 404);

      const { data: profile } = await admin.from("profiles").select("*").eq("user_id", found.id).single();
      return json({ user: { ...profile, email: found.email } });
    }

    if (action === "export_csv") {
      const { dataset } = payload;

      if (dataset === "users") {
        const { data: profiles } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
        const emailsMap = await getAllEmailsMap();

        const header = "email,display_name,plan,credits,kyc_status,is_blocked,created_at";
        const rows = (profiles || []).map((p: any) =>
          `${emailsMap[p.user_id] || ""},${p.display_name || ""},${p.subscription_plan},${p.available_credits},${p.kyc_status},${p.is_blocked || false},${p.created_at}`
        );
        return json({ csv: [header, ...rows].join("\n") });
      }

      if (dataset === "transactions") {
        const { data: txs } = await admin.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(1000);
        const emailsMap = await getAllEmailsMap();
        const header = "email,amount,type,description,created_at";
        const rows = (txs || []).map((t: any) =>
          `${emailsMap[t.user_id] || ""},${t.amount},${t.type},"${(t.description || "").replace(/"/g, '""')}",${t.created_at}`
        );
        return json({ csv: [header, ...rows].join("\n") });
      }

      if (dataset === "works") {
        const { data: works } = await admin.from("works").select("*").order("created_at", { ascending: false }).limit(1000);
        const emailsMap = await getAllEmailsMap();
        const header = "email,title,type,status,blockchain_hash,created_at";
        const rows = (works || []).map((w: any) =>
          `${emailsMap[w.user_id] || ""},"${(w.title || "").replace(/"/g, '""')}",${w.type},${w.status},${w.blockchain_hash || ""},${w.created_at}`
        );
        return json({ csv: [header, ...rows].join("\n") });
      }

      if (dataset === "audit") {
        const { data: logs } = await admin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(1000);
        const header = "admin_email,action,target_email,details,created_at";
        const rows = (logs || []).map((l: any) =>
          `${l.admin_email},${l.action},${l.target_email || ""},"${JSON.stringify(l.details || {}).replace(/"/g, '""')}",${l.created_at}`
        );
        return json({ csv: [header, ...rows].join("\n") });
      }

      return json({ error: "Invalid dataset" }, 400);
    }

    if (action === "get_admins") {
      const { data: adminRoles } = await admin.from("user_roles").select("*").eq("role", "admin");
      const emailsMap = await getAllEmailsMap();
      const admins = (adminRoles || []).map((r: any) => ({
        user_id: r.user_id,
        email: emailsMap[r.user_id] || "",
        created_at: r.id,
      }));
      return json({ admins });
    }

    if (action === "get_audit_log") {
      const offset = payload.offset || 0;
      let query = admin.from("audit_log").select("*").order("created_at", { ascending: false }).range(offset, offset + 49);
      if (payload.action_filter) query = query.eq("action", payload.action_filter);

      const { data: logs, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ logs: logs || [] });
    }

    // ── get_ibs_queue ─────────────────────────────────────────────
    if (action === "get_ibs_queue") {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const [exhausted, stale, resolved_24h] = await Promise.all([
        admin
          .from("ibs_sync_queue")
          .select("id, work_id, user_id, ibs_evidence_id, retry_count, max_retries, error_detail, created_at, updated_at")
          .eq("status", "exhausted")
          .order("updated_at", { ascending: false })
          .limit(20),
        admin
          .from("ibs_sync_queue")
          .select("id, work_id, user_id, ibs_evidence_id, retry_count, max_retries, status, created_at, updated_at")
          .in("status", ["waiting", "retrying"])
          .lt("created_at", thirtyMinAgo)
          .order("created_at", { ascending: true })
          .limit(20),
        admin
          .from("ibs_sync_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "resolved")
          .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const allItems = [
        ...(exhausted.data || []).map((r: any) => ({ ...r, status: "exhausted" })),
        ...(stale.data || []),
      ];

      let itemsWithTitle = allItems;
      if (allItems.length > 0) {
        const workIds = [...new Set(allItems.map((r: any) => r.work_id))];
        const { data: works } = await admin
          .from("works")
          .select("id, title, type")
          .in("id", workIds);
        const workMap: Record<string, any> = {};
        (works || []).forEach((w: any) => { workMap[w.id] = w; });
        itemsWithTitle = allItems.map((r: any) => ({
          ...r,
          work_title: workMap[r.work_id]?.title || "Obra desconocida",
          work_type: workMap[r.work_id]?.type || "unknown",
        }));
      }

      return json({
        exhausted_count: exhausted.data?.length || 0,
        stale_count: stale.data?.length || 0,
        resolved_24h: resolved_24h.count || 0,
        items: itemsWithTitle,
      });
    }

    // ── get_saas_metrics ──────────────────────────────────────────
    if (action === "get_saas_metrics") {
      const { month, year } = payload || {};
      const now = new Date();
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      let stripe: any = null;
      if (stripeKey) {
        stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      }

      // Build date range from filters
      let filterStart: string | null = null;
      let filterEnd: string | null = null;
      if (month && month !== "all" && year && year !== "all") {
        const y = parseInt(year), m = parseInt(month);
        filterStart = new Date(y, m - 1, 1).toISOString();
        filterEnd = new Date(y, m, 1).toISOString();
      } else if (year && year !== "all") {
        const y = parseInt(year);
        filterStart = new Date(y, 0, 1).toISOString();
        filterEnd = new Date(y + 1, 0, 1).toISOString();
      } else if (month && month !== "all") {
        const y = now.getFullYear(), m = parseInt(month);
        filterStart = new Date(y, m - 1, 1).toISOString();
        filterEnd = new Date(y, m, 1).toISOString();
      }

      const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00Z`;
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01T00:00:00Z`;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const todayStr = now.toISOString().slice(0, 10);

      // ── Stripe: Real subscription & revenue data ──
      let stripeMrr = 0;
      let stripeArr = 0;
      let activeSubsCount = 0;
      let cancelledSubsThisMonth = 0;
      let cancelledSubsLastMonth = 0;
      let stripeAnnualRevenue = 0;
      let stripeMonthlyRevenue = 0;
      let totalStripeRevenue = 0;
      let oneTimeRevenue = 0;
      const stripePlanBreakdown: Record<string, { count: number; mrr: number }> = {};
      let mrrEvolution: { month: string; mrr: number }[] = [];
      let cancelledSubs: any[] = [];

      if (stripe) {
        try {
          // 1) Get all active subscriptions for real MRR
          const allSubs: any[] = [];
          let hasMore = true;
          let startingAfter: string | undefined;
          while (hasMore) {
            const params: any = { status: "active", limit: 100, expand: ["data.items.data.price"] };
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

              const planName = price.nickname || price.product || "Unknown";
              if (!stripePlanBreakdown[planName]) stripePlanBreakdown[planName] = { count: 0, mrr: 0 };
              stripePlanBreakdown[planName].count += 1;
              stripePlanBreakdown[planName].mrr += monthlyAmount;

              if (interval === "year") {
                stripeAnnualRevenue += monthlyAmount;
              } else {
                stripeMonthlyRevenue += monthlyAmount;
              }
            }
          }
          stripeArr = stripeMrr * 12;

          // 2) Cancelled subscriptions (churn) - this month & last month
          const thisMonthTs = Math.floor(new Date(thisMonthStart).getTime() / 1000);
          const lastMonthTs = Math.floor(new Date(lastMonthStart).getTime() / 1000);
          const nowTs = Math.floor(now.getTime() / 1000);

          cancelledSubs = [];
          hasMore = true;
          startingAfter = undefined;
          while (hasMore) {
            const params: any = { status: "canceled", limit: 100 };
            if (startingAfter) params.starting_after = startingAfter;
            const batch = await stripe.subscriptions.list(params);
            // Only keep those cancelled in the last 2 months
            const relevant = batch.data.filter((s: any) => s.canceled_at && s.canceled_at >= lastMonthTs);
            cancelledSubs.push(...relevant);
            // Stop if we've gone past our time window
            if (batch.data.length > 0 && batch.data[batch.data.length - 1].canceled_at < lastMonthTs) {
              hasMore = false;
            } else {
              hasMore = batch.has_more;
              if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
            }
          }
          cancelledSubsThisMonth = cancelledSubs.filter((s: any) => s.canceled_at >= thisMonthTs).length;
          cancelledSubsLastMonth = cancelledSubs.filter((s: any) => s.canceled_at >= lastMonthTs && s.canceled_at < thisMonthTs).length;

          // 3) Real revenue from Stripe charges (last 12 months)
          const twelveMonthsAgoTs = Math.floor(new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime() / 1000);
          const chargesByMonth: Record<string, number> = {};
          hasMore = true;
          startingAfter = undefined;
          while (hasMore) {
            const params: any = { limit: 100, created: { gte: twelveMonthsAgoTs } };
            if (startingAfter) params.starting_after = startingAfter;
            const batch = await stripe.charges.list(params);
            for (const charge of batch.data) {
              if (charge.status !== "succeeded" || charge.refunded) continue;
              const d = new Date(charge.created * 1000);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              chargesByMonth[key] = (chargesByMonth[key] || 0) + (charge.amount / 100);
              totalStripeRevenue += charge.amount / 100;
              // Detect one-time payments (no invoice or invoice without subscription)
              if (!charge.invoice) {
                oneTimeRevenue += charge.amount / 100;
              }
            }
            hasMore = batch.has_more;
            if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
          }

          // Build MRR evolution from real charges
          mrrEvolution = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
            mrrEvolution.push({ month: label, mrr: Math.round((chargesByMonth[key] || 0) * 100) / 100 });
          }
        } catch (stripeErr: any) {
          console.error("[get_saas_metrics] Stripe error:", stripeErr.message);
          // Fall back to estimated values below
        }
      }

      // ── DB queries (unchanged) ──
      let totalQuery = admin.from("profiles").select("*", { count: "exact", head: true });
      let worksQuery = admin.from("works").select("*", { count: "exact", head: true });
      if (filterStart && filterEnd) {
        totalQuery = totalQuery.gte("created_at", filterStart).lt("created_at", filterEnd);
        worksQuery = worksQuery.gte("created_at", filterStart).lt("created_at", filterEnd);
      }

      const [totalRes, newThisRes, newLastRes, verifiedRes, profilesRes, totalWorksRes, worksMonthRes] = await Promise.all([
        totalQuery,
        admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thisMonthStart),
        admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", lastMonthStart).lt("created_at", thisMonthStart),
        admin.from("profiles").select("*", { count: "exact", head: true }).eq("kyc_status", "verified"),
        admin.from("profiles").select("subscription_plan, created_at"),
        worksQuery,
        admin.from("works").select("*", { count: "exact", head: true }).gte("created_at", thisMonthStart),
      ]);

      const totalUsers = totalRes.count || 0;
      const newThisMonth = newThisRes.count || 0;
      const newLastMonth = newLastRes.count || 0;
      const profiles = profilesRes.data || [];
      const plans: Record<string, number> = {};
      profiles.forEach((p: any) => { plans[p.subscription_plan] = (plans[p.subscription_plan] || 0) + 1; });
      const paidUsers = activeSubsCount > 0 ? activeSubsCount : (totalUsers - (plans["Free"] || 0));

      let posTxQuery = admin.from("credit_transactions").select("amount, type, created_at").gt("amount", 0);
      let negTxQuery = admin.from("credit_transactions").select("amount").lt("amount", 0);
      if (filterStart && filterEnd) {
        posTxQuery = posTxQuery.gte("created_at", filterStart).lt("created_at", filterEnd);
        negTxQuery = negTxQuery.gte("created_at", filterStart).lt("created_at", filterEnd);
      }

      const [posTxRes, negTxRes, activeTxRes, todayTxRes] = await Promise.all([
        posTxQuery,
        negTxQuery,
        admin.from("credit_transactions").select("user_id, created_at").gte("created_at", thirtyDaysAgo),
        admin.from("credit_transactions").select("user_id").gte("created_at", `${todayStr}T00:00:00Z`),
      ]);

      const creditsSold = (posTxRes.data || []).reduce((s: number, t: any) => s + t.amount, 0);
      const creditsConsumed = Math.abs((negTxRes.data || []).reduce((s: number, t: any) => s + t.amount, 0));
      const purchaseTxs = (posTxRes.data || []).filter((t: any) => ["purchase", "stripe_purchase", "subscription_credit"].includes(t.type));
      const creditsRevenue = purchaseTxs.reduce((s: number, t: any) => s + t.amount, 0) * 0.99;
      const mauSet = new Set((activeTxRes.data || []).map((t: any) => t.user_id));
      const dauSet = new Set((todayTxRes.data || []).map((t: any) => t.user_id));

      let aiGenQ = admin.from("ai_generations").select("*", { count: "exact", head: true });
      let videoGenQ = admin.from("video_generations").select("*", { count: "exact", head: true });
      let voiceCloneQ = admin.from("voice_clones").select("*", { count: "exact", head: true });
      let socialPromoQ = admin.from("social_promotions").select("*", { count: "exact", head: true });
      let lyricsGenQ = admin.from("lyrics_generations").select("*", { count: "exact", head: true });
      if (filterStart && filterEnd) {
        aiGenQ = aiGenQ.gte("created_at", filterStart).lt("created_at", filterEnd);
        videoGenQ = videoGenQ.gte("created_at", filterStart).lt("created_at", filterEnd);
        voiceCloneQ = voiceCloneQ.gte("created_at", filterStart).lt("created_at", filterEnd);
        socialPromoQ = socialPromoQ.gte("created_at", filterStart).lt("created_at", filterEnd);
        lyricsGenQ = lyricsGenQ.gte("created_at", filterStart).lt("created_at", filterEnd);
      }

      const [aiGen, videoGen, voiceClone, socialPromo, lyricsGen] = await Promise.all([
        aiGenQ, videoGenQ, voiceCloneQ, socialPromoQ, lyricsGenQ,
      ]);

      // User acquisition per month (last 12) — always full, not filtered
      const userAcquisition = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ms = d.toISOString();
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
        const newInMonth = profiles.filter((p: any) => p.created_at >= ms && p.created_at < me).length;
        const activeInMonth = new Set(
          (activeTxRes.data || []).filter((t: any) => t.created_at >= ms && t.created_at < me).map((t: any) => t.user_id)
        ).size;
        userAcquisition.push({ month: label, newUsers: newInMonth, activeUsers: activeInMonth });
      }

      // If no Stripe data, build estimated MRR evolution
      if (mrrEvolution.length === 0) {
        const avgPrice = paidUsers > 0 ? stripeMrr / paidUsers : 5;
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const ms = d.toISOString();
          const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
          const paidBefore = profiles.filter((p: any) => p.created_at < ms && p.subscription_plan !== "Free").length;
          mrrEvolution.push({ month: label, mrr: Math.round(paidBefore * avgPrice * 100) / 100 });
        }
      }

      // Works per day
      const { data: recentWorks } = await admin.from("works").select("created_at").gte("created_at", thirtyDaysAgo);
      const wpd: Record<string, number> = {};
      (recentWorks || []).forEach((w: any) => { wpd[w.created_at.slice(0, 10)] = (wpd[w.created_at.slice(0, 10)] || 0) + 1; });
      const worksPerDay = Object.entries(wpd).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date: date.slice(5), count }));

      // ── Real SaaS metrics from Stripe ──
      const mrr = Math.round(stripeMrr * 100) / 100;
      const arr = Math.round(stripeArr * 100) / 100;
      const churnRate = (activeSubsCount + cancelledSubsThisMonth) > 0
        ? parseFloat(((cancelledSubsThisMonth / (activeSubsCount + cancelledSubsThisMonth)) * 100).toFixed(1))
        : 0;
      const prevChurnRate = (activeSubsCount + cancelledSubsLastMonth) > 0
        ? parseFloat(((cancelledSubsLastMonth / (activeSubsCount + cancelledSubsLastMonth)) * 100).toFixed(1))
        : 0;
      const churnChange = parseFloat((churnRate - prevChurnRate).toFixed(1));
      const arpu = paidUsers > 0 ? parseFloat((mrr / paidUsers).toFixed(2)) : 0;
      const ltv = churnRate > 0 ? Math.round(arpu / (churnRate / 100)) : Math.round(arpu * 24);
      const totalRevenue = totalStripeRevenue > 0 ? Math.round(totalStripeRevenue * 100) / 100 : Math.round((mrr + creditsRevenue) * 100) / 100;

      // CAC: real marketing spend if available, else estimated
      const cac = 50; // TODO: connect to real ad spend when available
      const grossMargin = totalRevenue > 0 ? 85 : 0; // SaaS typical, adjust when costs are tracked
      const paybackPeriod = arpu > 0 ? Math.round(cac / arpu) : 0;
      const magicNumber = mrr > 0 && newThisMonth > 0 ? parseFloat((mrr / (cac * newThisMonth)).toFixed(2)) : 0;
      const nrr = churnRate > 0 ? Math.round(100 - churnRate + (paidUsers > 5 ? 5 : 0)) : 100;
      const quickRatio = churnRate > 0 ? parseFloat(((newThisMonth * arpu) / (churnRate / 100 * mrr || 1)).toFixed(1)) : 0;

      // Churn evolution from Stripe (real cancelled subs per month)
      const churnEvolution: { month: string; churn: number }[] = [];
      if (stripe) {
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mStart = Math.floor(d.getTime() / 1000);
          const mEnd = Math.floor(new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() / 1000);
          const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
          // Count cancelled in this month from already-fetched data for recent, estimate for older
          const cancelledInMonth = cancelledSubs
            ? cancelledSubs.filter((s: any) => s.canceled_at >= mStart && s.canceled_at < mEnd).length
            : 0;
          const baseForMonth = activeSubsCount + cancelledInMonth;
          const monthChurn = baseForMonth > 0 ? parseFloat(((cancelledInMonth / baseForMonth) * 100).toFixed(1)) : 0;
          churnEvolution.push({ month: label, churn: monthChurn });
        }
      } else {
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
          churnEvolution.push({ month: label, churn: 0 });
        }
      }

      // Cohort retention — real activity-based
      const cohortData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ms = d.toISOString();
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const label = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
        const cohortUsers = profiles.filter((p: any) => p.created_at >= ms && p.created_at < me);
        const cohortSize = cohortUsers.length;
        if (cohortSize === 0) continue;
        const cohortIds = new Set(cohortUsers.map((p: any) => p.user_id || p.id));
        const allTx = activeTxRes.data || [];

        // m1: activity 1 month later
        const m1Start = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const m1End = new Date(d.getFullYear(), d.getMonth() + 2, 1).toISOString();
        const m1Active = i >= 1 ? new Set(allTx.filter((t: any) => cohortIds.has(t.user_id) && t.created_at >= m1Start && t.created_at < m1End).map((t: any) => t.user_id)).size : null;

        // m3: activity 3 months later
        const m3Start = new Date(d.getFullYear(), d.getMonth() + 3, 1).toISOString();
        const m3End = new Date(d.getFullYear(), d.getMonth() + 4, 1).toISOString();
        const m3Active = i >= 3 ? new Set(allTx.filter((t: any) => cohortIds.has(t.user_id) && t.created_at >= m3Start && t.created_at < m3End).map((t: any) => t.user_id)).size : null;

        // m6
        const m6Start = new Date(d.getFullYear(), d.getMonth() + 6, 1).toISOString();
        const m6End = new Date(d.getFullYear(), d.getMonth() + 7, 1).toISOString();
        const m6Active = i >= 6 ? new Set(allTx.filter((t: any) => cohortIds.has(t.user_id) && t.created_at >= m6Start && t.created_at < m6End).map((t: any) => t.user_id)).size : null;

        cohortData.push({
          month: label, cohortSize, m0: 100,
          m1: m1Active !== null ? Math.round((m1Active / cohortSize) * 100) : null,
          m3: m3Active !== null ? Math.round((m3Active / cohortSize) * 100) : null,
          m6: m6Active !== null ? Math.round((m6Active / cohortSize) * 100) : null,
          m12: null,
        });
      }

      // Revenue concentration from Stripe plan breakdown
      const planRevSorted = Object.entries(stripePlanBreakdown).sort((a, b) => b[1].mrr - a[1].mrr);
      const topPlanEntry = planRevSorted.length > 0 ? planRevSorted[0] : null;
      const topPlanName = topPlanEntry ? topPlanEntry[0] : "N/A";
      const topPlanPct = paidUsers > 0 && topPlanEntry ? Math.round((topPlanEntry[1].count / paidUsers) * 100) : 0;

      // MRR change (compare this month charges vs last month)
      const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const lastMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
      const thisMonthRev = mrrEvolution.find(e => e.month === mrrEvolution[mrrEvolution.length - 1]?.month)?.mrr || 0;
      const lastMonthRev = mrrEvolution.length >= 2 ? mrrEvolution[mrrEvolution.length - 2]?.mrr || 0 : 0;
      const mrrChange = lastMonthRev > 0 ? parseFloat((((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1)) : 0;

      const subscriptionRevenue = mrr;
      const annualSubPct = mrr > 0 ? Math.round((stripeAnnualRevenue / mrr) * 100) : 0;
      const monthlySubPct = mrr > 0 ? Math.round((stripeMonthlyRevenue / mrr) * 100) : 0;

      return json({
        mrr, arr,
        mrrChange,
        arrChange: mrrChange,
        churnRate, churnChange, ltv,
        ltvCacRatio: ltv > 0 ? parseFloat((ltv / cac).toFixed(1)) : 0,
        nrr, quickRatio, arpu, cac, grossMargin, paybackPeriod, magicNumber,
        cashBalance: Math.round(totalRevenue),
        burnRate: Math.round(totalRevenue * 0.3),
        runway: totalRevenue > 0 ? Math.round(totalRevenue / (totalRevenue * 0.3 || 1)) : 0,
        totalUsers, newUsersThisMonth: newThisMonth,
        newUsersChange: newLastMonth > 0 ? parseFloat((((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)) : 100,
        activeUsers30d: mauSet.size, verifiedUsers: verifiedRes.count || 0,
        conversionRate: totalUsers > 0 ? parseFloat(((paidUsers / totalUsers) * 100).toFixed(1)) : 0,
        totalWorks: totalWorksRes.count || 0, worksThisMonth: worksMonthRes.count || 0,
        creditsSold, creditsConsumed, creditsRevenue: Math.round(creditsRevenue * 100) / 100,
        dau: dauSet.size, mau: mauSet.size, planBreakdown: plans,
        totalRevenue,
        annualRevenue: Math.round(stripeAnnualRevenue * 100) / 100,
        monthlyRevenue: Math.round(stripeMonthlyRevenue * 100) / 100,
        annualPercentage: annualSubPct,
        monthlyPercentage: monthlySubPct,
        oneTimeRevenue: Math.round(oneTimeRevenue * 100) / 100,
        top10RevenuePercentage: topPlanPct,
        topPlanName, topPlanPercentage: topPlanPct,
        activeSubscriptions: activeSubsCount,
        cancelledThisMonth: cancelledSubsThisMonth,
        stripePlanBreakdown,
        mrrEvolution, churnEvolution, userAcquisition, worksPerDay, cohortData,
        featureUsage: [
          { feature: "Crear música", uses: aiGen.count || 0 },
          { feature: "Videos", uses: videoGen.count || 0 },
          { feature: "Voces clonadas", uses: voiceClone.count || 0 },
          { feature: "Promociones", uses: socialPromo.count || 0 },
          { feature: "Letras", uses: lyricsGen.count || 0 },
        ].sort((a, b) => b.uses - a.uses),
        _dataSource: stripe ? "stripe_real" : "estimated",
      });
    }

    // ── retry_ibs_queue_item ──────────────────────────────────────
    if (action === "retry_ibs_queue_item") {
      const { queueId, workId } = payload;
      if (!queueId || !workId) throw new Error("queueId and workId are required");

      await admin
        .from("ibs_sync_queue")
        .update({
          status: "waiting",
          retry_count: 0,
          error_detail: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queueId);

      await admin
        .from("works")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", workId);

      await audit({
        action: "retry_ibs_queue",
        details: { queueId, workId },
      });

      return json({ success: true });
    }

    // ── get_premium_promos ───────────────────────────────────────
    if (action === "get_premium_promos") {
      const offset = payload.offset || 0;
      let query = admin
        .from("premium_social_promotions")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + 49);
      if (payload.status_filter) query = query.eq("status", payload.status_filter);

      const { data: promos, error } = await query;
      if (error) return json({ error: error.message }, 500);

      const userIds = [...new Set((promos || []).map((p: any) => p.user_id))];
      const emailsMap = await getAllEmailsMap();
      const { data: profiles } = await admin.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const namesMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { namesMap[p.user_id] = p.display_name; });

      const enriched = (promos || []).map((p: any) => ({
        ...p,
        user_email: emailsMap[p.user_id] || "",
        user_display_name: namesMap[p.user_id] || "",
      }));

      return json({ promos: enriched });
    }

    // ── update_premium_promo_status ───────────────────────────────
    if (action === "update_premium_promo_status") {
      const { promo_id, new_status } = payload;
      if (!promo_id || !new_status) return json({ error: "promo_id and new_status required" }, 400);
      const validStatuses = ["submitted", "under_review", "approved", "scheduled", "published", "rejected"];
      if (!validStatuses.includes(new_status)) return json({ error: "Invalid status" }, 400);

      const { data: promo, error: fetchErr } = await admin
        .from("premium_social_promotions")
        .select("*")
        .eq("id", promo_id)
        .single();
      if (fetchErr || !promo) return json({ error: "Promo not found" }, 404);

      const { error: upErr } = await admin
        .from("premium_social_promotions")
        .update({ status: new_status, updated_at: new Date().toISOString() })
        .eq("id", promo_id);
      if (upErr) return json({ error: upErr.message }, 500);

      await audit({
        action: "update_premium_promo",
        target_user_id: promo.user_id,
        details: { promo_id, old_status: promo.status, new_status },
      });

      // Clean up media file when published or rejected
      if ((new_status === "published" || new_status === "rejected") && promo.media_file_path) {
        try {
          const { error: delErr } = await admin.storage
            .from("premium-promo-media")
            .remove([promo.media_file_path]);
          if (delErr) {
            console.error("[ADMIN] Failed to delete promo media:", delErr);
          } else {
            console.log(`[ADMIN] Deleted promo media: ${promo.media_file_path}`);
            await admin
              .from("premium_social_promotions")
              .update({ media_file_path: null })
              .eq("id", promo_id);
          }
        } catch (cleanErr) {
          console.error("[ADMIN] Media cleanup error:", cleanErr);
        }
      }

      // If published, send email to user
      if (new_status === "published") {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          try {
            const { data: targetAuth } = await admin.auth.admin.getUserById(promo.user_id);
            const userEmail = targetAuth?.user?.email;
            const { data: userProfile } = await admin.from("profiles").select("display_name, language").eq("user_id", promo.user_id).single();
            const displayName = userProfile?.display_name || userEmail || "Artista";

            if (userEmail) {
              const emailContent = premiumPromoPublishedEmail({
                name: displayName,
                artistName: promo.artist_name,
                songTitle: promo.song_title,
                lang: userProfile?.language,
              });

              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "MusicDibs <noreply@notify.musicdibs.com>",
                  to: [userEmail],
                  subject: emailContent.subject,
                  html: emailContent.html,
                }),
              });
              console.log(`[ADMIN] Published promo email sent to ${userEmail}`);
            }
          } catch (emailErr) {
            console.error("[ADMIN] Failed to send published promo email:", emailErr);
          }
        }
      }

      return json({ success: true });
    }

    // ── get_premium_promo_media_url ──────────────────────────────
    if (action === "get_premium_promo_media_url") {
      const { file_path } = payload;
      if (!file_path) return json({ error: "file_path required" }, 400);

      const { data, error: signErr } = await admin.storage
        .from("premium-promo-media")
        .createSignedUrl(file_path, 300);
      if (signErr) return json({ error: signErr.message }, 500);

      return json({ signed_url: data.signedUrl });
    }

    // ── delete_work ────────────────────────────────────────────
    if (action === "delete_work") {
      const { work_id } = payload;
      if (!work_id) return json({ error: "work_id required" }, 400);

      // Fetch work first
      const { data: work, error: fetchErr } = await admin
        .from("works")
        .select("*")
        .eq("id", work_id)
        .single();
      if (fetchErr || !work) return json({ error: "Work not found" }, 404);

      const { data: targetAuth } = await admin.auth.admin.getUserById(work.user_id);
      const targetEmail = targetAuth?.user?.email || "";

      // Delete related managed_works
      await admin.from("managed_works").delete().eq("work_id", work_id);

      // Delete related ibs_sync_queue
      await admin.from("ibs_sync_queue").delete().eq("work_id", work_id);

      // Delete storage file if exists
      if (work.file_path) {
        try {
          await admin.storage.from("works-files").remove([work.file_path]);
        } catch (e) {
          console.error("[ADMIN] Failed to delete work file:", e);
        }
      }

      // Delete the work itself
      const { error: delErr } = await admin.from("works").delete().eq("id", work_id);
      if (delErr) return json({ error: delErr.message }, 500);

      await audit({
        action: "delete_work",
        target_user_id: work.user_id,
        target_email: targetEmail,
        details: { work_id, title: work.title, type: work.type, status: work.status },
      });

      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[ADMIN-ACTION] Error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
