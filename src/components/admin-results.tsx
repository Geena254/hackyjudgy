import { Fragment, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Download, FileText, Trophy } from "lucide-react";
import { Card, Button, Pill } from "@/components/app-shell";
import {
  useAllReviews,
  criteriaForSubmission,
  scoreMap,
  weightedPercent,
  type CriterionRow,
  type EventRow,
  type RoundRow,
  type ScoreRow,
  type SubmissionRow,
} from "@/lib/hackathon";
import { TIE_BREAKERS, judgingRubric, rankStandings } from "@/lib/results";

type Judge = { id: string; name: string; email: string };

const fmt = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? " - " : n.toFixed(digits).replace(/\.0$/, "");

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

  const rubric = useMemo(() => judgingRubric(rounds, criteria), [rounds, criteria]);
  const totalWeight = rubric.reduce((sum, c) => sum + (c.weight || 0), 0);

  const standings = useMemo(
    () => rankStandings(subs, criteria, rounds, scores, judges.map((j) => j.id)),
    [subs, criteria, rounds, scores, judges],
  );

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
              Average of all judges · score 0-5 per criterion, weighted
              {totalWeight !== 100 && totalWeight > 0 ? ` (weights total ${totalWeight}, scaled to 100)` : ""}
              {" · "}
              {judgesDone}/{judges.length} judges finished · click a team for each judge's scores
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/team-report" search={{ id: undefined }}>
              <Button variant="primary" tone="teal" disabled={standings.length === 0}>
                <FileText className="h-4 w-4" strokeWidth={2} /> Team reports (PDF)
              </Button>
            </Link>
            <Button variant="outline" tone="teal" onClick={exportCsv} disabled={standings.length === 0}>
              <Download className="h-4 w-4" strokeWidth={2} /> Export CSV
            </Button>
          </div>
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
                <th className="py-2 pr-3 text-right">Judges</th>
                <th className="py-2 text-right">Report</th>
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
                            <span className="text-muted-foreground"> - </span>
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
                      <td className="py-3 pr-3 text-right tabular-nums text-muted-foreground">
                        {st.judgeCount}/{judges.length}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to="/team-report"
                          search={{ id: st.submission.id }}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          style={{ color: "var(--teal)" }}
                        >
                          <FileText className="h-3.5 w-3.5" strokeWidth={2} /> PDF
                        </Link>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-muted/40">
                        <td colSpan={rubric.length + 5} className="px-3 py-3">
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
                  <td colSpan={rubric.length + 5} className="py-6 text-center text-muted-foreground">
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {standings.some((s) => s.tied) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Tie: still level after the rubric tie-breakers ({TIE_BREAKERS.join(", then ")}) - decide by
            panel vote.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Scores by judge</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Each judge's weighted score out of 100 for each team - useful for spotting outliers.
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
                          <span className="text-muted-foreground"> - </span>
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
                    {cell?.values[c.id] ?? <span className="text-muted-foreground"> - </span>}
                  </td>
                ))}
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">
                  {cell?.percent ?? <span className="text-muted-foreground"> - </span>}
                </td>
                <td className="max-w-md whitespace-pre-line py-1.5 text-muted-foreground">
                  {feedback || " - "}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
