import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authorize } from "../guard";
import { databaseError, notFoundError, toolError, toolSuccess } from "../errors";

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
          value: z
            .number()
            .int()
            .min(0)
            .describe("Must be between 0 and that criterion's max_score (see get_rubric)."),
        }),
      )
      .min(1)
      .describe("One entry per rubric criterion, using that criterion's scale."),
    feedback: z.string().trim().max(4000).optional().describe("Feedback shared with organisers."),
    private_notes: z
      .string()
      .trim()
      .max(4000)
      .optional()
      .describe("Notes visible only to this judge."),
    completed: z.boolean().optional().describe("Mark this review as finished."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ submission_id, scores, feedback, private_notes, completed }, ctx) => {
    const gate = await authorize(ctx, "score_submission");
    if (!gate.ok) return gate.result;

    const { data: submission, error: submissionError } = await gate.supabase
      .from("submissions")
      .select("id, title, round_id")
      .eq("id", submission_id)
      .maybeSingle();
    if (submissionError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(submissionError, "look up this submission");
    }
    if (!submission) {
      await gate.finish({ ok: false, code: "NOT_FOUND" });
      return notFoundError("That submission");
    }

    // Validate every score against its own criterion's configured scale.
    const criterionIds = [...new Set(scores.map((s) => s.criterion_id))];
    const { data: criteria, error: criteriaError } = await gate.supabase
      .from("criteria")
      .select("id, name, max_score, round_id")
      .in("id", criterionIds);
    if (criteriaError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(criteriaError, "look up this submission's rubric");
    }

    const byId = new Map((criteria ?? []).map((c) => [c.id, c]));
    const problems: string[] = [];
    for (const s of scores) {
      const criterion = byId.get(s.criterion_id);
      if (!criterion) {
        problems.push(`criterion ${s.criterion_id} does not exist or is not visible to you`);
        continue;
      }
      if (submission.round_id && criterion.round_id !== submission.round_id) {
        problems.push(`"${criterion.name}" does not belong to this submission's round`);
        continue;
      }
      const max = criterion.max_score ?? 5;
      if (s.value < 0 || s.value > max) {
        problems.push(`"${criterion.name}" accepts 0-${max}, but ${s.value} was given`);
      }
    }
    if (problems.length > 0) {
      await gate.finish({ ok: false, code: "INVALID_INPUT" });
      return toolError(
        "INVALID_INPUT",
        `No scores were saved: ${problems.join("; ")}.`,
        "Call get_rubric first and stay within each criterion's max_score.",
      );
    }



    const { error: scoreError } = await gate.supabase.from("scores").upsert(
      scores.map((s) => ({
        submission_id,
        criterion_id: s.criterion_id,
        judge_id: gate.userId,
        value: s.value,
      })),
      { onConflict: "submission_id,criterion_id,judge_id" },
    );
    if (scoreError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(scoreError, "save your scores");
    }

    if (feedback !== undefined || private_notes !== undefined || completed !== undefined) {
      const review: Record<string, unknown> = { submission_id, judge_id: gate.userId };
      if (feedback !== undefined) review.feedback = feedback;
      if (private_notes !== undefined) review.private_notes = private_notes;
      if (completed !== undefined) review.completed = completed;
      const { error: reviewError } = await gate.supabase
        .from("reviews")
        .upsert(review as never, { onConflict: "submission_id,judge_id" });
      if (reviewError) {
        await gate.finish({ ok: false, code: "DATABASE_ERROR" });
        return databaseError(reviewError, "save your feedback");
      }
    }

    await gate.finish({ ok: true });
    return toolSuccess(
      { submission_id, submission_title: submission.title, saved: scores.length },
      `Saved ${scores.length} score(s) for "${submission.title}".`,
    );
  },
});
