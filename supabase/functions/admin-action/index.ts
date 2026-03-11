import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const callerUserId = claimsData.claims.sub as string;

    // Admin check with service_role
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

    // ── ACTIONS ──────────────────────────────────────────────

    if (action === "get_users") {
      const offset = payload.offset || 0;
      const search = payload.search || "";

      let query = admin.from("profiles").select("*").order("created_at", { ascending: false }).range(offset, offset + 49);

      if (search) {
        query = query.or(`display_name.ilike.%${search}%`);
      }

      const { data: profiles, error } = await query;
      if (error) return json({ error: error.message }, 500);

      // Enrich with roles and works count
      const userIds = (profiles || []).map((p: any) => p.user_id);
      const { data: roles } = await admin.from("user_roles").select("user_id, role").in("user_id", userIds);
      const rolesMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { rolesMap[r.user_id] = r.role; });

      // Get works counts
      const enriched = [];
      for (const p of profiles || []) {
        const { count } = await admin.from("works").select("*", { count: "exact", head: true }).eq("user_id", p.user_id);
        enriched.push({ ...p, role: rolesMap[p.user_id] || "user", works_count: count || 0 });
      }

      // Get emails from auth
      const emailsMap: Record<string, string> = {};
      for (const uid of userIds) {
        const { data: authUser } = await admin.auth.admin.getUserById(uid);
        if (authUser?.user?.email) emailsMap[uid] = authUser.user.email;
      }

      const result = enriched.map((u: any) => ({ ...u, email: emailsMap[u.user_id] || "" }));

      // Filter by email if search provided
      const filtered = search
        ? result.filter((u: any) => u.email.toLowerCase().includes(search.toLowerCase()) || u.display_name?.toLowerCase().includes(search.toLowerCase()))
        : result;

      return json({ users: filtered, total: filtered.length });
    }

    if (action === "adjust_credits") {
      const { user_id, amount, reason } = payload;
      if (!user_id || amount === undefined || !reason) return json({ error: "user_id, amount, reason required" }, 400);
      if (amount < -1000 || amount > 1000) return json({ error: "amount must be between -1000 and 1000" }, 400);

      const { data: profile } = await admin.from("profiles").select("available_credits").eq("user_id", user_id).single();
      if (!profile) return json({ error: "User not found" }, 404);

      const newCredits = Math.max(0, profile.available_credits + amount);
      const { error: upErr } = await admin.from("profiles").update({ available_credits: newCredits, updated_at: new Date().toISOString() }).eq("user_id", user_id);
      if (upErr) return json({ error: upErr.message }, 500);

      await admin.from("credit_transactions").insert({
        user_id,
        amount,
        type: amount > 0 ? "admin_grant" : "admin_deduct",
        description: reason.slice(0, 200),
      });

      return json({ success: true, new_balance: newCredits });
    }

    if (action === "set_kyc") {
      const { user_id, status } = payload;
      if (!["pending", "verified", "rejected"].includes(status)) return json({ error: "Invalid status" }, 400);
      const { error } = await admin.from("profiles").update({ kyc_status: status, updated_at: new Date().toISOString() }).eq("user_id", user_id);
      if (error) return json({ error: error.message }, 500);
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
      return json({ success: true });
    }

    if (action === "get_all_works") {
      const offset = payload.offset || 0;
      let query = admin.from("works").select("*").order("created_at", { ascending: false }).range(offset, offset + 49);
      if (payload.status_filter) query = query.eq("status", payload.status_filter);
      if (payload.search) query = query.ilike("title", `%${payload.search}%`);

      const { data: works, error } = await query;
      if (error) return json({ error: error.message }, 500);

      // Enrich with user info
      const userIds = [...new Set((works || []).map((w: any) => w.user_id))];
      const emailsMap: Record<string, string> = {};
      const namesMap: Record<string, string> = {};
      for (const uid of userIds) {
        const { data: authUser } = await admin.auth.admin.getUserById(uid as string);
        if (authUser?.user?.email) emailsMap[uid as string] = authUser.user.email;
      }
      const { data: profiles } = await admin.from("profiles").select("user_id, display_name").in("user_id", userIds);
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

      // Credits
      const { data: posTx } = await admin.from("credit_transactions").select("amount").gt("amount", 0);
      const total_credits_sold = (posTx || []).reduce((s: number, t: any) => s + t.amount, 0);
      const { data: negTx } = await admin.from("credit_transactions").select("amount").lt("amount", 0);
      const total_credits_consumed = Math.abs((negTx || []).reduce((s: number, t: any) => s + t.amount, 0));

      // Plan breakdown
      const { data: allProfiles } = await admin.from("profiles").select("subscription_plan");
      const plan_breakdown: Record<string, number> = {};
      (allProfiles || []).forEach((p: any) => {
        plan_breakdown[p.subscription_plan] = (plan_breakdown[p.subscription_plan] || 0) + 1;
      });

      // Works per day (last 30 days)
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

      const { data: txs, error } = await query;
      if (error) return json({ error: error.message }, 500);

      // Enrich with emails
      const userIds = [...new Set((txs || []).map((t: any) => t.user_id))];
      const emailsMap: Record<string, string> = {};
      for (const uid of userIds) {
        const { data: authUser } = await admin.auth.admin.getUserById(uid as string);
        if (authUser?.user?.email) emailsMap[uid as string] = authUser.user.email;
      }

      const enriched = (txs || []).map((t: any) => ({ ...t, email: emailsMap[t.user_id] || "" }));
      return json({ transactions: enriched });
    }

    if (action === "search_user_by_email") {
      const { email } = payload;
      if (!email) return json({ error: "email required" }, 400);

      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 50 });
      const found = (users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) return json({ error: "User not found" }, 404);

      const { data: profile } = await admin.from("profiles").select("*").eq("user_id", found.id).single();
      return json({ user: { ...profile, email: found.email } });
    }

    if (action === "export_csv") {
      const { dataset } = payload;

      if (dataset === "users") {
        const { data: profiles } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
        const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const emailsMap: Record<string, string> = {};
        (authUsers || []).forEach((u: any) => { if (u.email) emailsMap[u.id] = u.email; });

        const header = "email,display_name,plan,credits,kyc_status,is_blocked,created_at";
        const rows = (profiles || []).map((p: any) =>
          `${emailsMap[p.user_id] || ""},${p.display_name || ""},${p.subscription_plan},${p.available_credits},${p.kyc_status},${p.is_blocked || false},${p.created_at}`
        );
        return json({ csv: [header, ...rows].join("\n") });
      }

      if (dataset === "transactions") {
        const { data: txs } = await admin.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(1000);
        const userIds = [...new Set((txs || []).map((t: any) => t.user_id))];
        const emailsMap: Record<string, string> = {};
        for (const uid of userIds) {
          const { data: authUser } = await admin.auth.admin.getUserById(uid as string);
          if (authUser?.user?.email) emailsMap[uid as string] = authUser.user.email;
        }
        const header = "email,amount,type,description,created_at";
        const rows = (txs || []).map((t: any) =>
          `${emailsMap[t.user_id] || ""},${t.amount},${t.type},"${(t.description || "").replace(/"/g, '""')}",${t.created_at}`
        );
        return json({ csv: [header, ...rows].join("\n") });
      }

      if (dataset === "works") {
        const { data: works } = await admin.from("works").select("*").order("created_at", { ascending: false }).limit(1000);
        const userIds = [...new Set((works || []).map((w: any) => w.user_id))];
        const emailsMap: Record<string, string> = {};
        for (const uid of userIds) {
          const { data: authUser } = await admin.auth.admin.getUserById(uid as string);
          if (authUser?.user?.email) emailsMap[uid as string] = authUser.user.email;
        }
        const header = "email,title,type,status,blockchain_hash,created_at";
        const rows = (works || []).map((w: any) =>
          `${emailsMap[w.user_id] || ""},"${(w.title || "").replace(/"/g, '""')}",${w.type},${w.status},${w.blockchain_hash || ""},${w.created_at}`
        );
        return json({ csv: [header, ...rows].join("\n") });
      }

      return json({ error: "Invalid dataset" }, 400);
    }

    if (action === "get_admins") {
      const { data: adminRoles } = await admin.from("user_roles").select("*").eq("role", "admin");
      const admins = [];
      for (const r of adminRoles || []) {
        const { data: authUser } = await admin.auth.admin.getUserById(r.user_id);
        admins.push({
          user_id: r.user_id,
          email: authUser?.user?.email || "",
          created_at: r.id, // approximation
        });
      }
      return json({ admins });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[ADMIN-ACTION] Error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
