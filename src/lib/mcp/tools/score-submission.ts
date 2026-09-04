import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "score_submission",
  title: "Score a submission",
  description:
    "Record the signed-in judge's scores for a submission's rubric criteria, with optional feedback, private notes and completion flag.",
  inputSchema: {
    submission_id: z.string().uuid().describe("The submission being scored."),
    scores: z
      .array(
        z.object({
          criterion_id: z.string().uuid(),
          value: z.number().int().min(0).max(100),
        }),
      )
      .min(1)
      .describe("One entry per rubric criterion, using that criterion's scale."),
    feedback: z.string().trim().max(4000).optional().describe("Feedback shared with organisers."),
    private_notes: z.string().trim().max(4000).optional().describe("Notes visible only to this judge."),
    completed: z.boolean().optional().describe("Mark this review as finished."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ submission_id, scores, feedback, private_notes, completed }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const judgeId = ctx.getUserId();
    if (!judgeId) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const { error: scoreError } = await supabase.from("scores").upsert(
      scores.map((s) => ({
        submission_id,
        criterion_id: s.criterion_id,
        judge_id: judgeId,
        value: s.value,
      })),
      { onConflict: "submission_id,criterion_id,judge_id" },
    );
    if (scoreError) return { content: [{ type: "text", text: scoreError.message }], isError: true };

    if (feedback !== undefined || private_notes !== undefined || completed !== undefined) {
      const review: Record<string, unknown> = { submission_id, judge_id: judgeId };
      if (feedback !== undefined) review.feedback = feedback;
      if (private_notes !== undefined) review.private_notes = private_notes;
      if (completed !== undefined) review.completed = completed;
      const { error: reviewError } = await supabase
        .from("reviews")
        .upsert(review, { onConflict: "submission_id,judge_id" });
      if (reviewError)
        return { content: [{ type: "text", text: reviewError.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: `Saved ${scores.length} score(s) for submission ${submission_id}.` }],
      structuredContent: { submission_id, saved: scores.length },
    };
  },
});
