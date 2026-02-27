import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signupUrl = "https://soulfuelsociety.lovable.app/signup";

    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 700; color: hsl(0, 0%, 16%); margin: 0 0 8px;">
            You're Invited to Soul Fuel Society
          </h1>
          <p style="font-size: 15px; color: hsl(0, 0%, 45%); margin: 0;">
            Your spot is ready — let's get started.
          </p>
        </div>

        <div style="margin-bottom: 32px;">
          <p style="font-size: 15px; line-height: 1.6; color: hsl(0, 0%, 25%);">
            Hey there! You've been invited to join <strong>Soul Fuel Society</strong> — a space built for women who train with intention.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: hsl(0, 0%, 25%);">
            Create your account using this email address (<strong>${email}</strong>) to get access.
          </p>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${signupUrl}" style="display: inline-block; background: hsl(213, 31%, 26%); color: hsl(60, 20%, 97%); padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
            Create Your Account
          </a>
        </div>

        <p style="font-size: 13px; color: hsl(0, 0%, 55%); text-align: center;">
          If you didn't expect this invite, you can safely ignore this email.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Soul Fuel Society <info@soulfuelsociety.app>",
        to: [email],
        subject: "You're invited to Soul Fuel Society ✨",
        html: htmlBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      throw new Error(`Resend API failed [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending invite email:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
