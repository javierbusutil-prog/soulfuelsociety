import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  console.log("[send-intake-email] handler entered:", req.method, new Date().toISOString());

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwtToken);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Authorize: admin or pt_admin
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

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[send-intake-email] RESEND_API_KEY missing from Deno.env");
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { user_id, full_name } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve member email
    const { data: memberData, error: memberErr } = await admin.auth.admin.getUserById(user_id);
    if (memberErr) throw memberErr;
    const email = memberData?.user?.email;
    if (!email) {
      console.warn("[send-intake-email] No email on file for user:", user_id);
      return new Response(
        JSON.stringify({ success: false, error: "No email on file" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const intakeUrl = "https://soulfuelsociety.lovable.app/intake";
    const firstName = String(full_name || "").split(" ")[0] || "there";

    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 700; color: hsl(213, 31%, 26%); margin: 0 0 8px;">
            Your Intake Form Is Ready
          </h1>
          <p style="font-size: 15px; color: hsl(0, 0%, 45%); margin: 0;">
            A quick step so your coach can tailor your training.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <p style="font-size: 15px; line-height: 1.6; color: hsl(0, 0%, 25%);">
            Hey ${firstName}! Your coach at <strong>Soul Fuel Society</strong> has sent you an intake form to complete. It helps us understand your goals, history, and where to meet you.
          </p>
        </div>

        <div style="margin: 24px 0; padding: 16px 20px; background: hsl(60, 20%, 97%); border-left: 3px solid hsl(213, 31%, 26%); border-radius: 4px;">
          <p style="font-size: 14px; line-height: 1.6; color: hsl(0, 0%, 25%); margin: 0;">
            It only takes a few minutes. Sign in to complete it whenever you have a moment today.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${intakeUrl}" style="display: inline-block; background: hsl(213, 31%, 26%); color: hsl(60, 20%, 97%); padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
            Complete Intake Form
          </a>
        </div>

        <p style="font-size: 13px; color: hsl(0, 0%, 55%); text-align: center;">
          If the button doesn't work, paste this link into your browser:<br />
          <a href="${intakeUrl}" style="color: hsl(213, 31%, 26%);">${intakeUrl}</a>
        </p>
      </div>
    `;

    const fromAddress = "Soul Fuel Society <info@soulfuelsociety.app>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: "Complete your intake form — Soul Fuel Society",
        html: htmlBody,
      }),
    });

    const rawBody = await res.text();
    console.log("[send-intake-email] Resend response status:", res.status);
    console.log("[send-intake-email] Resend response body:", rawBody);

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = { raw: rawBody };
    }

    if (!res.ok) {
      console.error("Resend error:", data);
      throw new Error(`Resend API failed [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[send-intake-email] Runtime error:", { message: msg, stack });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});