import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser();
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
      const rolesMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { rolesMap[r.user_id] = r.role; });

      // 1 query for all works counts
      const { data: worksCounts } = await admin.from("works").select("user_id").in("user_id", userIds);
      const worksCountMap: Record<string, number> = {};
      (worksCounts || []).forEach((w: any) => {
        worksCountMap[w.user_id] = (worksCountMap[w.user_id] || 0) + 1;
      });

      // 1 call for all emails
      const emailsMap = await getAllEmailsMap();

      let result = (profiles || []).map((p: any) => ({
        ...p,
        role: rolesMap[p.user_id] || "user",
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
      const { error } = await admin.from("profiles").update({ kyc_status: status, updated_at: new Date().toISOString() }).eq("user_id", user_id);
      if (error) return json({ error: error.message }, 500);

      const { data: targetAuth } = await admin.auth.admin.getUserById(user_id);
      await audit({
        action: "set_kyc",
        target_user_id: user_id,
        target_email: targetAuth?.user?.email || "",
        details: { new_status: status },
      });

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

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[ADMIN-ACTION] Error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
