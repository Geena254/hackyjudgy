import { defineTool } from "@lovable.dev/mcp-js";
import { defineTool as _unused } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated } from "../supabase";

void _unused;

export default defineTool({
  name: "my_scoring_progress",
  title: "My scoring progress",
  description:
    "Show the signed-in judge's own scores and reviews, including which submissions they have finished.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const judgeId = ctx.getUserId();
    if (!judgeId) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select("submission_id, criterion_id, value")
      .eq("judge_id", judgeId);
    if (scoresError)
      return { content: [{ type: "text", text: scoresError.message }], isError: true };

    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("submission_id, feedback, private_notes, completed, updated_at")
      .eq("judge_id", judgeId);
    if (reviewsError)
      return { content: [{ type: "text", text: reviewsError.message }], isError: true };

    const payload = { scores: scores ?? [], reviews: reviews ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
