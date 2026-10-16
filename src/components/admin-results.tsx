import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Trophy } from "lucide-react";
import { Card, Button, Pill } from "@/components/app-shell";
import {
  useAllReviews,
  buildStandings,
  criteriaForSubmission,
  scoreMap,
  weightedPercent,
  type CriterionRow,
  type EventRow,
  type PublicScore,
  type RoundRow,
  type ScoreRow,
  type SubmissionRow,
} from "@/lib/hackathon";

type Judge = { id: string; name: string; email: string };

// Rubric tie-breakers, in order (criteria not in the rubric are skipped).
const TIE_BREAKERS = ["Working Solution Demo", "Problem Validation"];

const fmt = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? "—" : n.toFixed(digits).replace(/\.0$/, "");

/** Admin view of the event results: leaderboard, per-judge breakdown and CSV export. */
export function AdminResults({
  event,
  rounds,
  criteria,
  subs,
  scores,
  judges,
}: {
  event: EventRow | undefined;
  rounds: RoundRow[];
  criteria: CriterionRow[];
  subs: SubmissionRow[];
  scores: ScoreRow[];
  judges: Judge[];
}) {
  const { data: reviews = [] } = useAllReviews();
  const [open, setOpen] = useState<string | null>(null);

  // Only count scores from judges currently on the panel.
  const panelScores = useMemo(() => {
    const ids = new Set(judges.map((j) => j.id));
    return scores.filter((s) => ids.has(s.judge_id));
  }, [scores, judges]);

  const rubric = useMemo(() => {
    const judging = rounds.find((r) => r.phase === "judging");
    const scoped = judging ? criteria.filter((c) => c.round_id === judging.id) : criteria;
    return [...(scoped.length ? scoped : criteria)].sort((a, b) => a.sort_order - b.sort_order);
  }, [rounds, criteria]);
  const totalWeight = rubric.reduce((sum, c) => sum + (c.weight || 0), 0);

  const standings = useMemo(() => {
    // Average every criterion across the panel, then rank on the weighted total.
    const averages: PublicScore[] = [];
    const groups = new Map<string, number[]>();
    for (const s of panelScores) {
      const key = `${s.submission_id}|${s.criterion_id}`;
      groups.set(key, [...(groups.get(key) ?? []), Number(s.value)]);
    }
    for (const [key, values] of groups) {
      const [submission_id, criterion_id] = key.split("|");
      averages.push({
        submission_id: submission_id!,
        criterion_id: criterion_id!,
        avg_value: values.reduce((a, b) => a + b, 0) / values.length,
        judge_count: values.length,
      });
    }

    const avgOf = (st: ReturnType<typeof buildStandings>[number], name: string) =>
      st.breakdown.find((b) => b.criterion.name === name)?.average ?? -1;

    const sorted = buildStandings(subs, criteria, averages, rounds).sort((a, b) => {
      const diff = (b.weightedTotal ?? -1) - (a.weightedTotal ?? -1);
      if (diff !== 0) return diff;
      for (const name of TIE_BREAKERS) {
        const t = avgOf(b, name) - avgOf(a, name);
        if (t !== 0) return t;
      }
      return 0;
    });

    // Teams still level after the tie-breakers share a rank (decided by panel vote).
    return sorted.map((row) => {
      if (row.weightedTotal === null) return { ...row, rank: null, tied: false };
      const same = (o: (typeof sorted)[number]) =>
        o.weightedTotal === row.weightedTotal &&
        TIE_BREAKERS.every((n) => avgOf(o, n) === avgOf(row, n));
      const first = sorted.findIndex(same);
      const tied = sorted.filter(same).length > 1;
      return { ...row, rank: first + 1, tied };
    });
  }, [panelScores, subs, criteria, rounds]);

  // Each judge's own weighted score for each team.
  const matrix = useMemo(
    () =>
      judges.map((j) => {
        const cells = subs.map((s) => {
          const crit = criteriaForSubmission(s, rounds, criteria);
          const vals = scoreMap(panelScores, s.id, j.id);
          const scored = crit.filter((c) => vals[c.id] !== undefined).length;
          return {
            submissionId: s.id,
            percent: weightedPercent(crit, vals),
            complete: crit.length > 0 && scored === crit.length,
            values: vals,
          };
        });
        const done = cells.filter((c) => c.complete);
        const avg = done.length
          ? done.reduce((sum, c) => sum + (c.percent ?? 0), 0) / done.length
          : null;
        return { judge: j, cells, completed: done.length, avg };
      }),
    [judges, subs, rounds, criteria, panelScores],
  );

  const judgesDone = matrix.filter((m) => subs.length > 0 && m.completed === subs.length).length;

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "Rank",
      "Project",
      "Team",
      ...rubric.map((c) => `${c.name} (avg /${c.max_score || 5}, weight ${c.weight})`),
      "Weighted total /100",
      "Judges scored",
      ...judges.map((j) => `${j.name} (/100)`),
    ];
    const lines = standings.map((st) => [
      st.rank ?? "",
      st.submission.title,
      st.submission.team_name ?? "",
      ...rubric.map((c) => fmt(st.breakdown.find((b) => b.criterion.id === c.id)?.average, 2)),
      fmt(st.weightedTotal),
      st.judgeCount,
      ...matrix.map((m) => fmt(m.cells.find((c) => c.submissionId === st.submission.id)?.percent ?? null, 0)),
    ]);
    const csv = [header, ...lines].map((row) => row.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(event?.name ?? "hackathon").replace(/[^\w-]+/g, "_")}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Trophy className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
              Results leaderboard
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Average of all judges · score 0–5 per criterion, weighted
              {totalWeight !== 100 && totalWeight > 0 ? ` (weights total ${totalWeight}, scaled to 100)` : ""}
              {" · "}
              {judgesDone}/{judges.length} judges finished · click a team for each judge's scores
            </p>
          </div>
          <Button variant="outline" tone="teal" onClick={exportCsv} disabled={standings.length === 0}>
            <Download className="h-4 w-4" strokeWidth={2} /> Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Project</th>
                {rubric.map((c) => (
                  <th key={c.id} className="py-2 pr-3 text-right font-semibold">
                    <div className="normal-case tracking-normal">{c.name}</div>
                    <div className="font-normal normal-case tracking-normal">weight {c.weight}</div>
                  </th>
                ))}
                <th className="py-2 pr-3 text-right">Total /100</th>
                <th className="py-2 text-right">Judges</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((st) => {
                const isOpen = open === st.submission.id;
                return (
                  <Fragment key={st.submission.id}>
                    <tr
                      className="cursor-pointer border-b border-border hover:bg-muted"
                      onClick={() => setOpen(isOpen ? null : st.submission.id)}
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1.5">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {st.rank === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <Pill tone={st.rank <= 3 ? "teal" : "gray"}>#{st.rank}</Pill>
                          )}
                          {st.tied && <Pill tone="warning">Tie</Pill>}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-foreground">{st.submission.title}</div>
                        {st.submission.team_name && (
                          <div className="text-xs text-muted-foreground">{st.submission.team_name}</div>
                        )}
                      </td>
                      {rubric.map((c) => {
                        const b = st.breakdown.find((x) => x.criterion.id === c.id);
                        return (
                          <td key={c.id} className="py-3 pr-3 text-right tabular-nums">
                            <div className="text-foreground">
                              {fmt(b?.average, 2)}
                              <span className="text-muted-foreground">/{c.max_score || 5}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{fmt(b?.points)} pts</div>
                          </td>
                        );
                      })}
                      <td className="py-3 pr-3 text-right text-base font-bold tabular-nums" style={{ color: "var(--teal)" }}>
                        {fmt(st.weightedTotal)}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">
                        {st.judgeCount}/{judges.length}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-muted/40">
                        <td colSpan={rubric.length + 4} className="px-3 py-3">
                          <JudgeBreakdown
                            submissionId={st.submission.id}
                            rubric={rubric}
                            matrix={matrix}
                            reviews={reviews}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={rubric.length + 4} className="py-6 text-center text-muted-foreground">
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {standings.some((s) => s.tied) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Tie: still level after the rubric tie-breakers ({TIE_BREAKERS.join(", then ")}) — decide by
            panel vote.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Scores by judge</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Each judge's weighted score out of 100 for each team — useful for spotting outliers.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Judge</th>
                {standings.map((st) => (
                  <th key={st.submission.id} className="py-2 pr-3 text-right normal-case tracking-normal">
                    {st.submission.title}
                  </th>
                ))}
                <th className="py-2 pr-3 text-right">Avg given</th>
                <th className="py-2 text-right">Done</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((m) => (
                <tr key={m.judge.id} className="border-b border-border">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-foreground">{m.judge.name}</div>
                    {m.judge.email && m.judge.email !== m.judge.name && (
                      <div className="text-xs text-muted-foreground">{m.judge.email}</div>
                    )}
                  </td>
                  {standings.map((st) => {
                    const cell = m.cells.find((c) => c.submissionId === st.submission.id);
                    return (
                      <td key={st.submission.id} className="py-2.5 pr-3 text-right tabular-nums">
                        {cell?.percent === null || cell?.percent === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={cell.complete ? "text-foreground" : "text-muted-foreground"}>
                            {cell.percent}
                            {!cell.complete && " (partial)"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">{fmt(m.avg, 0)}</td>
                  <td className="py-2.5 text-right">
                    <Pill tone={subs.length > 0 && m.completed === subs.length ? "teal" : "gray"} variant="outline">
                      {m.completed}/{subs.length}
                    </Pill>
                  </td>
                </tr>
              ))}
              {matrix.length === 0 && (
                <tr>
                  <td colSpan={standings.length + 3} className="py-6 text-center text-muted-foreground">
                    No judges on the panel yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function JudgeBreakdown({
  submissionId,
  rubric,
  matrix,
  reviews,
}: {
  submissionId: string;
  rubric: CriterionRow[];
  matrix: {
    judge: Judge;
    cells: { submissionId: string; percent: number | null; complete: boolean; values: Record<string, number> }[];
  }[];
  reviews: { submission_id: string; judge_id: string; feedback: string | null }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wider text-muted-foreground">
            <th className="py-1.5 pr-3">Judge</th>
            {rubric.map((c) => (
              <th key={c.id} className="py-1.5 pr-3 text-right normal-case tracking-normal">
                {c.name}
              </th>
            ))}
            <th className="py-1.5 pr-3 text-right">/100</th>
            <th className="py-1.5">Feedback to the team</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((m) => {
            const cell = m.cells.find((c) => c.submissionId === submissionId);
            const feedback = reviews
              .find((r) => r.submission_id === submissionId && r.judge_id === m.judge.id)
              ?.feedback?.trim();
            return (
              <tr key={m.judge.id} className="align-top">
                <td className="py-1.5 pr-3 font-medium text-foreground">{m.judge.name}</td>
                {rubric.map((c) => (
                  <td key={c.id} className="py-1.5 pr-3 text-right tabular-nums">
                    {cell?.values[c.id] ?? <span className="text-muted-foreground">—</span>}
                  </td>
                ))}
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">
                  {cell?.percent ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="max-w-md whitespace-pre-line py-1.5 text-muted-foreground">
                  {feedback || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
