import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Card, Button } from "@/components/app-shell";
import { PlpLogo } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { useSelectedEvent } from "@/hooks/use-selected-event";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSubmissions,
  useAllScores,
  useAllReviews,
  useJudges,
  criteriaForSubmission,
  scoreMap,
  weightedPercent,
  type CriterionRow,
  type ReviewRow,
  type ScoreRow,
} from "@/lib/hackathon";
import { judgingRubric, rankStandings, type RankedStanding } from "@/lib/results";

export const Route = createFileRoute("/_authenticated/team-report")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({ meta: [{ title: "Team reports - GavelLab" }] }),
  component: TeamReports,
});

type Judge = { id: string; name: string; email: string };

const fmt = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? " - " : n.toFixed(digits).replace(/\.0$/, "");

/** Rubric band for an average score out of 5. */
function band(avg: number | null, max: number) {
  if (avg === null) return " - ";
  const v = (avg / max) * 5;
  if (v >= 4.5) return "Excellent";
  if (v >= 3.5) return "Good";
  if (v >= 2.5) return "Adequate";
  if (v >= 1.5) return "Weak";
  return "Missing";
}

function TeamReports() {
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { isAdmin, ready } = useAuth();
  const { data: events = [] } = useEvents();
  const [event] = useSelectedEvent(events);
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: subs = [] } = useSubmissions(event?.id);
  const { data: scores = [] } = useAllScores();
  const { data: reviews = [] } = useAllReviews();
  const { data: roster = [] } = useJudges(event?.id);

  const [showNames, setShowNames] = useState(false);
  const [showRank, setShowRank] = useState(true);

  // Stable judge numbering (Judge 1, 2, …) across every team's report.
  const judges = useMemo(() => [...roster].sort((a, b) => a.name.localeCompare(b.name)), [roster]);
  const rubric = useMemo(() => judgingRubric(rounds, criteria), [rounds, criteria]);
  const standings = useMemo(
    () => rankStandings(subs, criteria, rounds, scores, judges.map((j) => j.id)),
    [subs, criteria, rounds, scores, judges],
  );
  const shown = id ? standings.filter((s) => s.submission.id === id) : standings;

  // Browsers use the page title as the default PDF file name.
  useEffect(() => {
    const team = id ? standings.find((s) => s.submission.id === id)?.submission : undefined;
    const label = team ? `${team.title}${team.team_name ? ` (${team.team_name})` : ""}` : "All teams";
    document.title = `${label} - ${event?.name ?? "Hackathon"} results`;
  }, [id, standings, event?.name]);

  if (ready && !isAdmin) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Only organisers can open team reports.</div>
    );
  }

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <style>{`@page { size: A4; margin: 14mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <div className="sticky top-0 z-10 border-b border-border bg-background print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <select
            value={id ?? ""}
            onChange={(e) => navigate({ search: { id: e.target.value || undefined } })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All teams ({standings.length})</option>
            {standings.map((s) => (
              <option key={s.submission.id} value={s.submission.id}>
                {s.submission.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
            Judge names
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input type="checkbox" checked={showRank} onChange={(e) => setShowRank(e.target.checked)} />
            Rank
          </label>
          <div className="ml-auto">
            <Button variant="primary" tone="teal" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>
        <p className="mx-auto max-w-4xl px-4 pb-3 text-xs text-muted-foreground">
          In the print window choose <strong>Save as PDF</strong>. Each team prints on its own page;
          pick a single team above to save one file per team. Private judge notes are never included.
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 print:max-w-none print:space-y-0 print:p-0">
        {shown.map((st, i) => (
          <TeamReport
            key={st.submission.id}
            standing={st}
            total={standings.length}
            eventName={event?.name ?? ""}
            rubric={rubric}
            judges={judges}
            scores={scores}
            reviews={reviews}
            criteriaFor={(s) => criteriaForSubmission(s, rounds, criteria)}
            showNames={showNames}
            showRank={showRank}
            last={i === shown.length - 1}
          />
        ))}
        {shown.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">No results yet.</Card>
        )}
      </div>
    </div>
  );
}

function TeamReport({
  standing: st,
  total,
  eventName,
  rubric,
  judges,
  scores,
  reviews,
  criteriaFor,
  showNames,
  showRank,
  last,
}: {
  standing: RankedStanding;
  total: number;
  eventName: string;
  rubric: CriterionRow[];
  judges: Judge[];
  scores: ScoreRow[];
  reviews: ReviewRow[];
  criteriaFor: (s: RankedStanding["submission"]) => CriterionRow[];
  showNames: boolean;
  showRank: boolean;
  last: boolean;
}) {
  const s = st.submission;
  const crit = criteriaFor(s);
  const panel = judges
    .map((j, i) => {
      const values = scoreMap(scores, s.id, j.id);
      const feedback = reviews.find((r) => r.submission_id === s.id && r.judge_id === j.id)?.feedback?.trim() ?? "";
      return {
        label: showNames ? j.name : `Judge ${i + 1}`,
        values,
        percent: weightedPercent(crit, values),
        feedback,
      };
    })
    .filter((p) => p.percent !== null || p.feedback);

  return (
    <article
      className="rounded-lg border border-border bg-white p-8 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
      style={{ breakAfter: last ? "auto" : "page" }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
        <PlpLogo className="h-10" />
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Judging report</div>
          <div className="text-sm font-semibold">{eventName}</div>
          <div className="text-xs text-neutral-500">
            {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </header>

      <section className="mt-5">
        <h1 className="text-2xl font-bold">{s.title}</h1>
        {s.team_name && <div className="text-sm text-neutral-600">{s.team_name}</div>}
        {s.description && (
          <p className="mt-2 whitespace-pre-line text-xs text-neutral-600">{s.description}</p>
        )}
      </section>

      <section className="mt-5 grid grid-cols-3 gap-3" style={{ breakInside: "avoid" }}>
        <SummaryBox label="Overall score" value={`${fmt(st.weightedTotal)} / 100`} highlight />
        {showRank ? (
          <SummaryBox
            label="Final position"
            value={st.rank === null ? " - " : `${st.rank} of ${total}${st.tied ? " (tied)" : ""}`}
          />
        ) : (
          <SummaryBox label="Rating" value={band(st.weightedTotal === null ? null : st.weightedTotal / 20, 5)} />
        )}
        <SummaryBox label="Judges" value={`${st.judgeCount}`} />
      </section>

      <section className="mt-6" style={{ breakInside: "avoid" }}>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider" style={{ color: "var(--teal)" }}>
          Score by criterion
        </h2>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-neutral-300 text-xs uppercase tracking-wider text-neutral-500">
              <th className="py-2 pr-2">Criterion</th>
              <th className="py-2 pr-2 text-right">Weight</th>
              <th className="py-2 pr-2 text-right">Average</th>
              <th className="py-2 pr-2">Rating</th>
              <th className="py-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rubric.map((c) => {
              const b = st.breakdown.find((x) => x.criterion.id === c.id);
              const max = c.max_score || 5;
              return (
                <tr key={c.id} className="border-b border-neutral-200 align-top">
                  <td className="py-2 pr-2">
                    <div className="font-semibold">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-neutral-500">{c.description.split("\n")[0]}</div>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{c.weight}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {fmt(b?.average, 2)} / {max}
                  </td>
                  <td className="py-2 pr-2">{band(b?.average ?? null, max)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {fmt(b?.points)} / {fmt(b?.maxPoints)}
                  </td>
                </tr>
              );
            })}
            <tr className="font-bold">
              <td className="py-2 pr-2" colSpan={4}>
                Overall
              </td>
              <td className="py-2 text-right tabular-nums">{fmt(st.weightedTotal)} / 100</td>
            </tr>
          </tbody>
        </table>
      </section>

      {panel.length > 0 && (
        <section className="mt-6" style={{ breakInside: "avoid" }}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider" style={{ color: "var(--teal)" }}>
            Each judge's scores
          </h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-neutral-300 text-xs uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-2">Judge</th>
                {rubric.map((c) => (
                  <th key={c.id} className="py-2 pr-2 text-right normal-case tracking-normal">
                    {c.name}
                  </th>
                ))}
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {panel.map((p) => (
                <tr key={p.label} className="border-b border-neutral-200">
                  <td className="py-2 pr-2 font-semibold">{p.label}</td>
                  {rubric.map((c) => (
                    <td key={c.id} className="py-2 pr-2 text-right tabular-nums">
                      {p.values[c.id] ?? " - "}
                    </td>
                  ))}
                  <td className="py-2 text-right tabular-nums">{p.percent ?? " - "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider" style={{ color: "var(--teal)" }}>
          Feedback from the judges
        </h2>
        <div className="space-y-3">
          {panel.filter((p) => p.feedback).map((p) => (
            <div
              key={p.label}
              className="rounded-md border border-neutral-200 p-3"
              style={{ breakInside: "avoid" }}
            >
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-500">{p.label}</div>
              <p className="whitespace-pre-line">{p.feedback}</p>
            </div>
          ))}
          {!panel.some((p) => p.feedback) && (
            <p className="text-neutral-500">No written feedback was recorded for this team.</p>
          )}
        </div>
      </section>

      <footer className="mt-6 border-t border-neutral-200 pt-3 text-[11px] text-neutral-500">
        Each criterion is scored 0-5 (half points allowed) by every judge. Points = (average ÷ 5) ×
        weight; the overall score is out of 100. Power Learn Project · {eventName}
      </footer>
    </article>
  );
}

function SummaryBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-md border p-3"
      style={highlight ? { borderColor: "var(--teal)", background: "var(--teal-soft)" } : { borderColor: "#e5e5e5" }}
    >
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-lg font-bold" style={highlight ? { color: "var(--teal)" } : undefined}>
        {value}
      </div>
    </div>
  );
}
