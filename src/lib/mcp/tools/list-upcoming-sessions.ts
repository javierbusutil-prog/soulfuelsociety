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
  name: "list_upcoming_sessions",
  title: "List my upcoming sessions",
  description: "List the signed-in Soul Fuel member's upcoming coaching sessions (scheduled and not yet completed).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Maximum number of sessions to return. Defaults to 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const max = limit ?? 10;
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("session_attendees")
      .select("session_id, sessions!inner(id, title, scheduled_for, status, note)")
      .eq("user_id", ctx.getUserId())
      .gte("sessions.scheduled_for", new Date().toISOString())
      .neq("sessions.status", "completed")
      .neq("sessions.status", "didnt_happen")
      .order("scheduled_for", { referencedTable: "sessions", ascending: true })
      .limit(max);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((r: any) => r.sessions);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { sessions: rows },
    };
  },
});