import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_submissions",
  title: "List submissions",
  description:
    "List project submissions for an event, including team, category, status and project links. Only admins and judges can read these.",
  inputSchema: {
    event_id: z.string().uuid().describe("The event whose submissions to list."),
    status: z
      .string()
      .trim()
      .optional()
      .describe("Optional status filter, e.g. submitted, under_review, scored."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("submissions")
      .select("id, title, team_name, category, description, status, repo_url, demo_url, deck_url, round_id")
      .eq("event_id", event_id)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { submissions: data ?? [] },
    };
  },
});
