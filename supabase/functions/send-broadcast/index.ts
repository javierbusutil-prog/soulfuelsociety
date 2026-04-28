import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const escape = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const UNSUBSCRIBE_SECRET = Deno.env.get("UNSUBSCRIBE_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
    if (!UNSUBSCRIBE_SECRET) throw new Error("UNSUBSCRIBE_SECRET is not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");

    const { to_email, to_name, subject, body, user_id } = await req.json();

    if (!to_email || !subject || !body || !user_id) {
      return new Response(
        JSON.stringify({ error: "to_email, subject, body, and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await sha256Hex(`${user_id}${UNSUBSCRIBE_SECRET}`);
    const unsubUrl = `${SUPABASE_URL}/functions/v1/handle-unsubscribe?user_id=${encodeURIComponent(user_id)}&token=${token}`;

    const html = `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; background: #FBF7F4; color: #2E4A6B;">
  <div style="text-align:center; padding: 8px 0 24px;">
    <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; letter-spacing: 0.5px; color:#2E4A6B;">
      Soul Fuel Society <span style="color:#B8973A;">🔥</span>
    </div>
  </div>
  <div style="background:#ffffff; border-radius: 12px; padding: 28px 24px; font-size: 15px; line-height: 1.65; white-space: pre-wrap; color:#222;">
${escape(body)}
  </div>
  <hr style="border:none; border-top:1px solid #E6DED4; margin: 28px 0;" />
  <div style="font-size: 12px; color:#7a7a7a; text-align:center; line-height:1.6;">
    Soul Fuel Society, LLC | Miami, FL<br/>
    You're receiving this as a Soul Fuel Society member.<br/>
    <a href="${unsubUrl}" style="color:#2E4A6B; text-decoration:underline;">Unsubscribe</a>
  </div>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Soul Fuel Society <information@soulfuelsociety.app>",
        to: [to_email],
        reply_to: "javy@soulfuelsociety.app",
        subject,
        html,
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error("[send-broadcast] Resend error:", res.status, raw);
      throw new Error(`Resend failed [${res.status}]: ${raw}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-broadcast] Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});