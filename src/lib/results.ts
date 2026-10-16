import {
  buildStandings,
  type CriterionRow,
  type PublicScore,
  type PublicSubmission,
  type RoundRow,
  type ScoreRow,
  type Standing,
} from "@/lib/hackathon";

// Rubric tie-breakers, in order (criteria not in the rubric are skipped).
export const TIE_BREAKERS = ["Working Solution Demo", "Problem Validation"];

export type RankedStanding = Standing & { tied: boolean };

/** Mean score per submission × criterion across the given judges. */
export function panelAverages(scores: ScoreRow[], judgeIds: string[]): PublicScore[] {
  const ids = new Set(judgeIds);
  const groups = new Map<string, number[]>();
  for (const s of scores) {
    if (!ids.has(s.judge_id)) continue;
    const key = `${s.submission_id}|${s.criterion_id}`;
    groups.set(key, [...(groups.get(key) ?? []), Number(s.value)]);
  }
  return [...groups].map(([key, values]) => {
    const [submission_id, criterion_id] = key.split("|");
    return {
      submission_id: submission_id!,
      criterion_id: criterion_id!,
      avg_value: values.reduce((a, b) => a + b, 0) / values.length,
      judge_count: values.length,
    };
  });
}

/**
 * Ranks submissions on the panel's weighted average, breaking ties with the
 * rubric tie-breakers. Teams still level afterwards share a rank (panel vote).
 */
export function rankStandings(
  subs: PublicSubmission[],
  criteria: CriterionRow[],
  rounds: RoundRow[],
  scores: ScoreRow[],
  judgeIds: string[],
): RankedStanding[] {
  const avgOf = (st: Standing, name: string) =>
    st.breakdown.find((b) => b.criterion.name === name)?.average ?? -1;

  const sorted = buildStandings(subs, criteria, panelAverages(scores, judgeIds), rounds).sort(
    (a, b) => {
      const diff = (b.weightedTotal ?? -1) - (a.weightedTotal ?? -1);
      if (diff !== 0) return diff;
      for (const name of TIE_BREAKERS) {
        const t = avgOf(b, name) - avgOf(a, name);
        if (t !== 0) return t;
      }
      return 0;
    },
  );

  return sorted.map((row) => {
    if (row.weightedTotal === null) return { ...row, rank: null, tied: false };
    const same = (o: Standing) =>
      o.weightedTotal === row.weightedTotal &&
      TIE_BREAKERS.every((n) => avgOf(o, n) === avgOf(row, n));
    return {
      ...row,
      rank: sorted.findIndex(same) + 1,
      tied: sorted.filter(same).length > 1,
    };
  });
}

/** The judging rubric: the judging round's criteria (or all), in order. */
export function judgingRubric(rounds: RoundRow[], criteria: CriterionRow[]) {
  const judging = rounds.find((r) => r.phase === "judging");
  const scoped = judging ? criteria.filter((c) => c.round_id === judging.id) : criteria;
  return [...(scoped.length ? scoped : criteria)].sort((a, b) => a.sort_order - b.sort_order);
}
