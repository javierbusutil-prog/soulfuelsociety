import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function htmlPage(title: string, message: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin:0; font-family:'Helvetica Neue',Arial,sans-serif; background:#FBF7F4; color:#2E4A6B; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
    .card { max-width: 520px; background:#fff; border-radius:14px; padding:36px 28px; text-align:center; box-shadow: 0 4px 24px rgba(46,74,107,0.08); }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0 0 8px; }
    p { font-size: 15px; line-height: 1.6; color:#444; margin: 8px 0 0; }
    .flame { color:#B8973A; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-family:Georgia,serif;font-size:22px;margin-bottom:16px;">Soul Fuel Society <span class="flame">🔥</span></div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

serve(async (req) => {
  try {
    const UNSUBSCRIBE_SECRET = Deno.env.get("UNSUBSCRIBE_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!UNSUBSCRIBE_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
      return htmlPage("Unsubscribe Unavailable", "This unsubscribe link cannot be processed at this time. Please contact support.");
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const token = url.searchParams.get("token");

    if (!userId || !token) {
      return htmlPage("Invalid Link", "This unsubscribe link is missing required information.");
    }

    const expected = await sha256Hex(`${userId}${UNSUBSCRIBE_SECRET}`);
    if (token.toLowerCase() !== expected.toLowerCase()) {
      return htmlPage("Invalid Link", "This unsubscribe link is invalid or has expired.");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error } = await admin
      .from("profiles")
      .update({ email_unsubscribed: true })
      .eq("id", userId);

    if (error) {
      console.error("[handle-unsubscribe] DB error:", error);
      return htmlPage("Something Went Wrong", "We couldn't update your preferences. Please try again later.");
    }

    return htmlPage(
      "You're Unsubscribed",
      "You have been unsubscribed from Soul Fuel Society emails. You will still receive important account notifications."
    );
  } catch (e) {
    console.error("[handle-unsubscribe] Error:", e);
    return htmlPage("Something Went Wrong", "We couldn't process your request. Please try again later.");
  }
});