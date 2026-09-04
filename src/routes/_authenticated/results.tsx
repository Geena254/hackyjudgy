import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { AppShell, Card, Pill } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSubmissions,
  useMyScores,
  useMyReviews,
  criteriaForSubmission,
  weightedPercent,
  scoreMap,
  formatDate,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({
    meta: [
      { title: "My Results — EvalDesk" },
      {
        name: "description",
        content:
          "Review the final score, rank and feedback you recorded for every submission you judged.",
      },
      { property: "og:title", content: "My judging results — EvalDesk" },
      {
        property: "og:description",
        content: "Final scores, ranks and feedback for the submissions you judged.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JudgeResults,
});

function JudgeResults() {
  const { user } = useAuth();
  const { data: events = [] } = useEvents();
  const event = events.find((e) => e.status === "active") ?? events[0];
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: subs = [] } = useSubmissions(event?.id);
  const { data: myScores = [] } = useMyScores(user?.id);
  const { data: myReviews = [] } = useMyReviews(user?.id);

  const rows = useMemo(() => {
    const scored = subs.map((s) => {
      const crit = criteriaForSubmission(s, rounds, criteria);
      const values = scoreMap(myScores, s.id, user?.id);
      const review = myReviews.find((r) => r.submission_id === s.id);
      const breakdown = crit.map((c) => ({
        id: c.id,
        name: c.name,
        weight: c.weight,
        max: c.max_score || 5,
        value: values[c.id],
      }));
      return {
        submission: s,
        percent: weightedPercent(crit, values),
        breakdown,
        feedback: review?.feedback?.trim() ?? "",
        completed: !!review?.completed,
      };
    });
    const ranked = [...scored].sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
    return ranked.map((r, i) => ({ ...r, rank: r.percent === null ? null : i + 1 }));
  }, [subs, rounds, criteria, myScores, myReviews, user?.id]);

  const finished = rows.filter((r) => r.percent !== null).length;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Judge portal
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">My results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {event
              ? `${event.name} · ${formatDate(event.starts_on)} – ${formatDate(event.ends_on)}`
              : "No hackathon has been published yet."}
          </p>
        </div>
        <Link
          to="/judge"
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to my dashboard
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-md"
            style={{ background: "var(--teal-soft)" }}
          >
            <Trophy className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Submissions with a final score
            </div>
            <div className="text-2xl font-bold text-foreground">
              {finished}/{rows.length}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <Card key={r.submission.id} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.rank === null ? "gray" : "magenta"}>
                    {r.rank === null ? "Unranked" : `Rank #${r.rank}`}
                  </Pill>
                  {r.submission.category && <Pill tone="gray">{r.submission.category}</Pill>}
                  <Pill tone={r.completed ? "teal" : "gray"}>
                    {r.completed ? "Complete" : "In progress"}
                  </Pill>
                </div>
                <h2 className="mt-2 text-lg font-bold text-foreground">{r.submission.title}</h2>
                {r.submission.team_name && (
                  <p className="text-sm text-muted-foreground">{r.submission.team_name}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Final score
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {r.percent === null ? "—" : `${r.percent}%`}
                </div>
              </div>
            </div>

            {r.breakdown.length > 0 && (
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {r.breakdown.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {c.name}
                      <span className="ml-1 text-xs">({c.weight}%)</span>
                    </span>
                    <span className="font-semibold text-foreground">
                      {c.value === undefined ? "—" : `${c.value}/${c.max}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 rounded-md bg-surface p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My feedback
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {r.feedback || "No feedback written yet."}
              </p>
            </div>

            <div className="mt-4">
              <Link
                to="/scoring"
                search={{ id: r.submission.id }}
                className="text-sm font-semibold"
                style={{ color: "var(--teal)" }}
              >
                Open in scoring queue
              </Link>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Results appear here once submissions are added and you start scoring.
          </Card>
        )}
      </div>
    </AppShell>
  );
}
