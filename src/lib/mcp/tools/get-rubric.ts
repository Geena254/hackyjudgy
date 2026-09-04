import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authorize } from "../guard";
import { databaseError, notFoundError, toolSuccess } from "../errors";

export default defineTool({
  name: "get_rubric",
  title: "Get event rubric",
  description: "Get the rounds of an event with their judging criteria, weights and maximum scores.",
  inputSchema: { event_id: z.string().uuid().describe("The event to read the rubric for.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id }, ctx) => {
    const gate = await authorize(ctx, "get_rubric");
    if (!gate.ok) return gate.result;

    const { data: rounds, error: roundsError } = await gate.supabase
      .from("rounds")
      .select("id, name, phase, deadline, submission_method, sort_order")
      .eq("event_id", event_id)
      .order("sort_order");
    if (roundsError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(roundsError, "read the event rounds");
    }
    if (!rounds || rounds.length === 0) {
      await gate.finish({ ok: false, code: "NOT_FOUND" });
      return notFoundError("A rubric for this event");
    }

    const { data: criteria, error: criteriaError } = await gate.supabase
      .from("criteria")
      .select("id, round_id, name, description, weight, max_score, sort_order")
      .in(
        "round_id",
        rounds.map((r) => r.id),
      )
      .order("sort_order");
    if (criteriaError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(criteriaError, "read the rubric criteria");
    }

    await gate.finish({ ok: true });
    return toolSuccess({ event_id, rounds, criteria: criteria ?? [] });
  },
});
