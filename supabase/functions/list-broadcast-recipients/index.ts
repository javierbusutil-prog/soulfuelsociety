import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Authorize: must be admin or pt_admin
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (roleErr) throw roleErr;
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin" || r.role === "pt_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, full_name, email_unsubscribed")
      .order("full_name", { ascending: true });
    if (profErr) throw profErr;

    // Fetch all paid/admin role assignments
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw rolesErr;

    const paidSet = new Set(
      (roles ?? [])
        .filter((r: any) => ["paid", "admin", "pt_admin"].includes(r.role))
        .map((r: any) => r.user_id)
    );

    // Fetch emails from auth.users via admin API (paginated)
    const emailMap = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (usersErr) throw usersErr;
      const users = usersPage?.users ?? [];
      for (const u of users) {
        if (u.email) emailMap.set(u.id, u.email);
      }
      if (users.length < perPage) break;
      page++;
      if (page > 50) break; // safety
    }

    const members = (profiles ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: emailMap.get(p.id) ?? null,
      is_paid: paidSet.has(p.id),
      email_unsubscribed: !!p.email_unsubscribed,
    }));

    return new Response(JSON.stringify({ members }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[list-broadcast-recipients] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});