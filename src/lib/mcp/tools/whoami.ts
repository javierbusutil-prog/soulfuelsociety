import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in Soul Fuel member's profile: id, name, email, roles, and membership status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const sb = supabaseForUser(ctx);
    const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      sb.from("profiles").select("id, full_name, subscription_status, selected_plan, membership_expires_at, intake_submitted, intake_requested").eq("id", userId).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (pErr || rErr) {
      return { content: [{ type: "text", text: (pErr ?? rErr)!.message }], isError: true };
    }
    const result = {
      id: userId,
      email: ctx.getUserEmail() ?? null,
      full_name: profile?.full_name ?? null,
      roles: (roles ?? []).map((r) => r.role),
      subscription_status: profile?.subscription_status ?? null,
      selected_plan: profile?.selected_plan ?? null,
      membership_expires_at: profile?.membership_expires_at ?? null,
      intake_submitted: profile?.intake_submitted ?? false,
      intake_requested: profile?.intake_requested ?? false,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});