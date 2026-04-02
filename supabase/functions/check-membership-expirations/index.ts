import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date().toISOString();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysStart = new Date(threeDaysFromNow);
  threeDaysStart.setHours(0, 0, 0, 0);
  const threeDaysEnd = new Date(threeDaysFromNow);
  threeDaysEnd.setHours(23, 59, 59, 999);

  try {
    // 1. Find expired members (membership_expires_at in the past, still active)
    const { data: expiredMembers, error: fetchErr } = await supabase
      .from("profiles")
      .select("id, full_name, membership_expires_at")
      .eq("subscription_status", "active")
      .not("membership_expires_at", "is", null)
      .lt("membership_expires_at", now);

    if (fetchErr) throw fetchErr;

    // Get all coaches
    const { data: coaches } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "pt_admin"]);

    const coachIds = coaches?.map((c) => c.user_id) || [];

    // Process expired members
    for (const member of expiredMembers || []) {
      // Downgrade profile
      await supabase
        .from("profiles")
        .update({
          selected_plan: null,
          subscription_status: "inactive",
          membership_expires_at: null,
        })
        .eq("id", member.id);

      // Downgrade role
      await supabase
        .from("user_roles")
        .update({ role: "free" })
        .eq("user_id", member.id);

      // Notify member
      await supabase.from("notifications").insert({
        user_id: member.id,
        type: "membership_expired",
        title: "Your membership has expired",
        body: "Your plan has been moved to the free tier. Contact your coach to renew.",
        reference_id: member.id,
      });

      // Notify coaches
      const nameParts = (member.full_name || "Member").split(" ");
      const firstName = nameParts[0] || "Member";
      const lastName = nameParts.slice(1).join(" ") || "";

      for (const coachId of coachIds) {
        await supabase.from("notifications").insert({
          user_id: coachId,
          type: "membership_expired",
          title: "Membership expired",
          body: `${firstName} ${lastName}'s paid membership has expired and they have been moved to the free tier.`,
          reference_id: member.id,
        });
      }
    }

    // 2. 3-day advance warning for coaches
    const { data: soonExpiring } = await supabase
      .from("profiles")
      .select("id, full_name, membership_expires_at")
      .eq("subscription_status", "active")
      .not("membership_expires_at", "is", null)
      .gte("membership_expires_at", threeDaysStart.toISOString())
      .lt("membership_expires_at", threeDaysEnd.toISOString());

    for (const member of soonExpiring || []) {
      const firstName = (member.full_name || "A member").split(" ")[0];
      for (const coachId of coachIds) {
        await supabase.from("notifications").insert({
          user_id: coachId,
          type: "membership_expiring_soon",
          title: "Membership expiring soon",
          body: `${firstName}'s membership expires in 3 days.`,
          reference_id: member.id,
        });
      }
    }

    return new Response(
      JSON.stringify({
        expired: expiredMembers?.length || 0,
        warned: soonExpiring?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error checking expirations:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
