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

  try {
    // Find paid members who were upgraded 48+ hours ago,
    // haven't submitted intake, and haven't received the reminder yet
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: members, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("subscription_status", "active")
      .eq("intake_submitted", false)
      .eq("intake_reminder_sent", false)
      .not("upgraded_at", "is", null)
      .lt("upgraded_at", cutoff);

    if (error) throw error;

    let sent = 0;
    for (const member of members || []) {
      // Send reminder notification
      await supabase.from("notifications").insert({
        user_id: member.id,
        type: "intake_reminder",
        title: "Don't forget your intake form",
        body: "It only takes a few minutes. Your coach is waiting to build your program.",
        reference_id: member.id,
      });

      // Mark reminder as sent
      await supabase
        .from("profiles")
        .update({ intake_reminder_sent: true })
        .eq("id", member.id);

      sent++;
    }

    return new Response(
      JSON.stringify({ reminders_sent: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error checking intake reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
