import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_rubric",
  title: "Get event rubric",
  description:
    "Get the rounds of an event with their judging criteria, weights and maximum scores.",
  inputSchema: { event_id: z.string().uuid().describe("The event to read the rubric for.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("id, name, phase, deadline, submission_method, sort_order")
      .eq("event_id", event_id)
      .order("sort_order");
    if (roundsError)
      return { content: [{ type: "text", text: roundsError.message }], isError: true };
    const roundIds = (rounds ?? []).map((r) => r.id);
    let criteria: Record<string, unknown>[] = [];
    if (roundIds.length > 0) {
      const { data, error } = await supabase
        .from("criteria")
        .select("id, round_id, name, description, weight, max_score, sort_order")
        .in("round_id", roundIds)
        .order("sort_order");
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      criteria = (data ?? []) as Record<string, unknown>[];
    }
    const payload = { rounds: (rounds ?? []) as Record<string, unknown>[], criteria };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
    };

  },
});
