import { defineTool } from "@lovable.dev/mcp-js";
import { authorize } from "../guard";
import { databaseError, toolSuccess } from "../errors";

export default defineTool({
  name: "my_scoring_progress",
  title: "My scoring progress",
  description:
    "Show the signed-in judge's own scores and reviews, including which submissions they have finished.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const gate = await authorize(ctx, "my_scoring_progress");
    if (!gate.ok) return gate.result;

    const { data: scores, error: scoresError } = await gate.supabase
      .from("scores")
      .select("submission_id, criterion_id, value")
      .eq("judge_id", gate.userId);
    if (scoresError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(scoresError, "read your scores");
    }

    const { data: reviews, error: reviewsError } = await gate.supabase
      .from("reviews")
      .select("submission_id, feedback, private_notes, completed, updated_at")
      .eq("judge_id", gate.userId);
    if (reviewsError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(reviewsError, "read your reviews");
    }

    await gate.finish({ ok: true });
    return toolSuccess({
      scores: scores ?? [],
      reviews: reviews ?? [],
      completed_count: (reviews ?? []).filter((r) => r.completed).length,
    });
  },
});
