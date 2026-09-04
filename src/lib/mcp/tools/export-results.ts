import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { authorize } from "../guard";
import { databaseError, notFoundError, toolSuccess } from "../errors";

type CriterionRow = { id: string; name: string; weight: number; max_score: number };

/** Weighted percentage for one judge's scores on one submission. */
function weightedPercent(criteria: CriterionRow[], values: Record<string, number>) {
  const scored = criteria.filter((c) => values[c.id] !== undefined);
  if (scored.length === 0) return null;
  const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0) || 1;
  const earned = scored.reduce(
    (sum, c) => sum + c.weight * (values[c.id]! / (c.max_score || 5)),
    0,
  );
  return Math.round((earned / totalWeight) * 1000) / 10;
}

export default defineTool({
  name: "export_submission_results",
  title: "Export submission results",
  description:
    "Export one submission's final results as structured JSON: weighted final score, rank within its event, per-criterion averages and judge feedback. Admins see every judge's data; judges see their own.",
  inputSchema: {
    submission_id: z.string().uuid().describe("The submission whose results to export."),
    include_criteria_breakdown: z
      .boolean()
      .optional()
      .describe("Include the per-criterion averages (default true)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ submission_id, include_criteria_breakdown }, ctx) => {
    const gate = await authorize(ctx, "export_submission_results");
    if (!gate.ok) return gate.result;
    const supabase = gate.supabase;

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, event_id, title, team_name, category, status")
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

    const { data: siblings, error: siblingsError } = await supabase
      .from("submissions")
      .select("id, title")
      .eq("event_id", submission.event_id);
    if (siblingsError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(siblingsError, "read the other submissions in this event");
    }

    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("id")
      .eq("event_id", submission.event_id);
    if (roundsError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(roundsError, "read the event rounds");
    }

    let criteria: CriterionRow[] = [];
    if (rounds && rounds.length > 0) {
      const { data, error } = await supabase
        .from("criteria")
        .select("id, name, weight, max_score")
        .in(
          "round_id",
          rounds.map((r) => r.id),
        )
        .order("sort_order");
      if (error) {
        await gate.finish({ ok: false, code: "DATABASE_ERROR" });
        return databaseError(error, "read the rubric criteria");
      }
      criteria = data ?? [];
    }
    if (criteria.length === 0) {
      await gate.finish({ ok: false, code: "NOT_FOUND" });
      return notFoundError("A rubric for this event");
    }

    const submissionIds = (siblings ?? []).map((s) => s.id);
    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select("submission_id, criterion_id, judge_id, value")
      .in("submission_id", submissionIds);
    if (scoresError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(scoresError, "read the scores");
    }

    // Average of each judge's weighted percentage, per submission.
    const averageFor = (id: string) => {
      const byJudge = new Map<string, Record<string, number>>();
      for (const s of scores ?? []) {
        if (s.submission_id !== id) continue;
        const values = byJudge.get(s.judge_id) ?? {};
        values[s.criterion_id] = s.value;
        byJudge.set(s.judge_id, values);
      }
      const percents = [...byJudge.values()]
        .map((values) => weightedPercent(criteria, values))
        .filter((p): p is number => p !== null);
      if (percents.length === 0) return { score: null, judges: 0 };
      return {
        score: Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 10) / 10,
        judges: percents.length,
      };
    };

    const ranked = submissionIds
      .map((id) => ({ id, ...averageFor(id) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const own = averageFor(submission_id);
    const rank = ranked.findIndex((r) => r.id === submission_id);

    const criteriaBreakdown =
      include_criteria_breakdown === false
        ? undefined
        : criteria.map((c) => {
            const values = (scores ?? [])
              .filter((s) => s.submission_id === submission_id && s.criterion_id === c.id)
              .map((s) => s.value);
            return {
              criterion_id: c.id,
              name: c.name,
              weight: c.weight,
              max_score: c.max_score,
              average:
                values.length > 0
                  ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
                  : null,
              scores_recorded: values.length,
            };
          });

    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("judge_id, feedback, completed, updated_at")
      .eq("submission_id", submission_id);
    if (reviewsError) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(reviewsError, "read the judge feedback");
    }

    await gate.finish({ ok: true });
    return toolSuccess({
      submission: {
        id: submission.id,
        title: submission.title,
        team_name: submission.team_name,
        category: submission.category,
        status: submission.status,
        event_id: submission.event_id,
      },
      final_score_percent: own.score,
      judges_scored: own.judges,
      rank: rank >= 0 ? rank + 1 : null,
      ranked_out_of: ranked.length,
      criteria: criteriaBreakdown ?? null,
      feedback: (reviews ?? []).map((r) => ({
        judge_id: r.judge_id,
        feedback: r.feedback,
        completed: r.completed,
        updated_at: r.updated_at,
      })),
      scope:
        "Rank and averages reflect only the scores your account is allowed to read; admins see all judges.",
    });
  },
});
