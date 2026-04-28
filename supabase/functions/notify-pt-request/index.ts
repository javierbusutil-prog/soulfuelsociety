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
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body = await req.json();
    const {
      full_name,
      email,
      phone,
      date_of_birth,
      chief_complaint,
      symptom_duration,
      pain_scale,
      goals,
      preferred_contact,
      best_time,
    } = body ?? {};

    if (!full_name || !email) {
      return new Response(
        JSON.stringify({ error: "full_name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const escape = (s: unknown) =>
      String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #222;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">New PT Evaluation Request</h1>
        <p style="font-size: 14px; color: #555; margin: 0 0 24px;">
          A member just submitted a Physical Therapy evaluation request.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color:#666;">Name</td><td><strong>${escape(full_name)}</strong></td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Email</td><td>${escape(email)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Phone</td><td>${escape(phone)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Date of Birth</td><td>${escape(date_of_birth)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Symptom Duration</td><td>${escape(symptom_duration)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Pain Scale</td><td>${escape(pain_scale)} / 10</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Preferred Contact</td><td>${escape(preferred_contact)}</td></tr>
          <tr><td style="padding: 6px 0; color:#666;">Best Time</td><td>${escape(best_time)}</td></tr>
        </table>
        <h2 style="font-size: 15px; margin: 24px 0 6px;">Chief Complaint</h2>
        <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escape(chief_complaint)}</p>
        <h2 style="font-size: 15px; margin: 24px 0 6px;">Goals</h2>
        <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escape(goals)}</p>
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
        to: ["javier@soulfuelsociety.app"],
        reply_to: email,
        subject: `New PT Request — ${full_name}`,
        html,
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error("[notify-pt-request] Resend error:", res.status, raw);
      throw new Error(`Resend failed [${res.status}]: ${raw}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[notify-pt-request] Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});