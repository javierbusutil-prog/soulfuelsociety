import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listUpcomingSessionsTool from "./tools/list-upcoming-sessions";
import listDailyDoseTool from "./tools/list-daily-dose";

// The OAuth issuer must be the direct Supabase host, not the runtime proxy.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "soul-fuel-society-mcp",
  title: "Soul Fuel Society",
  version: "0.1.0",
  instructions:
    "Tools for a signed-in Soul Fuel Society member. Use `whoami` to fetch the member's profile and roles, `list_upcoming_sessions` to see their scheduled coaching sessions, and `list_daily_dose` to read recent Daily Dose posts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listUpcomingSessionsTool, listDailyDoseTool],
});