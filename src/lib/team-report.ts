import {
  scoreMap,
  weightedPercent,
  type CriterionRow,
  type ReviewRow,
  type ScoreRow,
} from "@/lib/hackathon";

/** Shared by the printable team report and the emailed results PDF. */

export type ReportJudge = { id: string; name: string };

export type JudgePanelRow = {
  label: string;
  /** Score per criterion id. */
  values: Record<string, number>;
  /** The judge's weighted score out of 100. */
  percent: number | null;
  feedback: string;
};

export const fmt = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? " - " : n.toFixed(digits).replace(/\.0$/, "");

/** Rubric band for an average score out of `max`. */
export function band(avg: number | null, max: number) {
  if (avg === null) return " - ";
  const v = (avg / max) * 5;
  if (v >= 4.5) return "Excellent";
  if (v >= 3.5) return "Good";
  if (v >= 2.5) return "Adequate";
  if (v >= 1.5) return "Weak";
  return "Missing";
}

/**
 * Each judge's scores and feedback for one entry, numbered "Judge 1, 2, …" in
 * the order given (or named). Judges who neither scored nor wrote feedback are
 * left out. Private notes are never read.
 */
export function judgePanel({
  submissionId,
  criteria,
  judges,
  scores,
  reviews,
  showNames,
}: {
  submissionId: string;
  criteria: CriterionRow[];
  judges: ReportJudge[];
  scores: ScoreRow[];
  reviews: ReviewRow[];
  showNames: boolean;
}): JudgePanelRow[] {
  return judges
    .map((j, i) => {
      const values = scoreMap(scores, submissionId, j.id);
      const feedback =
        reviews
          .find((r) => r.submission_id === submissionId && r.judge_id === j.id)
          ?.feedback?.trim() ?? "";
      return {
        label: showNames ? j.name : `Judge ${i + 1}`,
        values,
        percent: weightedPercent(criteria, values),
        feedback,
      };
    })
    .filter((p) => p.percent !== null || p.feedback);
}
