import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authorize } from "../guard";
import { databaseError, toolSuccess } from "../errors";

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
    const gate = await authorize(ctx, "list_submissions");
    if (!gate.ok) return gate.result;

    let query = gate.supabase
      .from("submissions")
      .select(
        "id, title, team_name, category, description, status, repo_url, demo_url, deck_url, round_id",
      )
      .eq("event_id", event_id)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(error, "read the submissions for this event");
    }

    await gate.finish({ ok: true });
    return toolSuccess({ event_id, count: data?.length ?? 0, submissions: data ?? [] });
  },
});
