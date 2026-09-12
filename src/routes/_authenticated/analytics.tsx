import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Award, CheckCircle2, FileText, Users } from "lucide-react";
import { AppShell, Card, Pill, ProgressBar } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSubmissions,
  useAllScores,
  useAllReviews,
  useJudges,
  criteriaForSubmission,
  weightedPercent,
  scoreMap,
  formatDate,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — EvalDesk" },
      {
        name: "description",
        content:
          "Track hackathon judging analytics: scoring progress per round, judge activity and weighted rubric results across submissions.",
      },
      { property: "og:title", content: "Judging analytics — EvalDesk" },
      {
        property: "og:description",
        content:
          "See scoring progress, judge activity and weighted rubric results for your hackathon rounds.",
      },
      { property: "og:url", content: "https://hackyjudgy.lovable.app/analytics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
          style={{ background: "var(--teal-soft)" }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
    </Card>
  );
}

function AnalyticsPage() {
  const { isAdmin, ready } = useAuth();
  const { data: events = [] } = useEvents();
  const event = events.find((e) => e.status === "active") ?? events[0];
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: submissions = [] } = useSubmissions(event?.id);
  const { data: scores = [] } = useAllScores();
  const { data: reviews = [] } = useAllReviews();
  const { data: judges = [] } = useJudges();

  const subIds = useMemo(() => new Set(submissions.map((s) => s.id)), [submissions]);

  const expected = submissions.length * Math.max(judges.length, 1);
  const completedReviews = reviews.filter((r) => r.completed && subIds.has(r.submission_id)).length;
  const completion = expected === 0 ? 0 : Math.round((completedReviews / expected) * 100);

  const roundProgress = useMemo(
    () =>
      rounds.map((round) => {
        const subs = submissions.filter((s) => s.round_id === round.id);
        const target = subs.length * Math.max(judges.length, 1);
        const done = reviews.filter(
          (r) => r.completed && subs.some((s) => s.id === r.submission_id),
        ).length;
        return {
          round,
          submissions: subs.length,
          done,
          target,
          percent: target === 0 ? 0 : Math.round((done / target) * 100),
        };
      }),
    [rounds, submissions, reviews, judges.length],
  );

  const judgeActivity = useMemo(
    () =>
      judges
        .map((judge) => {
          const mine = reviews.filter(
            (r) => r.judge_id === judge.id && subIds.has(r.submission_id),
          );
          const done = mine.filter((r) => r.completed).length;
          const percent =
            submissions.length === 0 ? 0 : Math.round((done / submissions.length) * 100);
          const marks = scores.filter(
            (s) => s.judge_id === judge.id && subIds.has(s.submission_id),
          ).length;
          const last = mine
            .map((r) => r.updated_at)
            .sort()
            .pop();
          return { judge, done, percent, marks, last };
        })
        .sort((a, b) => b.percent - a.percent),
    [judges, reviews, scores, submissions.length, subIds],
  );

  const leaderboard = useMemo(() => {
    const rows = submissions.map((s) => {
      const crit = criteriaForSubmission(s, rounds, criteria);
      const judgeIds = Array.from(
        new Set(scores.filter((x) => x.submission_id === s.id).map((x) => x.judge_id)),
      );
      const perJudge = judgeIds
        .map((jid) => weightedPercent(crit, scoreMap(scores, s.id, jid)))
        .filter((v): v is number => v !== null);
      const percent =
        perJudge.length === 0
          ? null
          : Math.round(perJudge.reduce((a, b) => a + b, 0) / perJudge.length);
      return { submission: s, percent, judgeCount: perJudge.length };
    });
    return [...rows]
      .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1))
      .map((r, i) => ({ ...r, rank: r.percent === null ? null : i + 1 }));
  }, [submissions, rounds, criteria, scores]);

  if (ready && !isAdmin) {
    return (
      <AppShell>
        <Card className="p-10 text-center">
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Panel-wide analytics are available to organisers. Your own scores and feedback are in
            your results page.
          </p>
          <Link
            to="/results"
            className="mt-4 inline-flex items-center rounded-md px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--teal)" }}
          >
            View my results
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Organiser view
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {event
            ? `${event.name} · ${formatDate(event.starts_on)} – ${formatDate(event.ends_on)}`
            : "Create a hackathon to start collecting judging data."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<FileText className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />}
          label="Submissions"
          value={String(submissions.length)}
          hint={`${rounds.length} round${rounds.length === 1 ? "" : "s"}`}
        />
        <Stat
          icon={<Users className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />}
          label="Judges on the panel"
          value={String(judges.length)}
        />
        <Stat
          icon={
            <CheckCircle2 className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
          }
          label="Reviews completed"
          value={`${completedReviews}/${expected}`}
          hint={`${completion}% of the panel's workload`}
        />
        <Stat
          icon={<Award className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />}
          label="Top weighted score"
          value={leaderboard[0]?.percent === null || !leaderboard[0] ? "—" : `${leaderboard[0].percent}%`}
          hint={leaderboard[0]?.submission.title ?? undefined}
        />
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold text-foreground">Progress by round</h2>
        <div className="mt-4 space-y-5">
          {roundProgress.map((r) => (
            <div key={r.round.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{r.round.name}</span>
                  <Pill tone="gray">{r.round.phase}</Pill>
                </div>
                <span className="text-sm text-muted-foreground">
                  {r.done}/{r.target} reviews · {r.submissions} submissions
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={r.percent} />
              </div>
            </div>
          ))}
          {roundProgress.length === 0 && (
            <p className="text-sm text-muted-foreground">No rounds have been set up yet.</p>
          )}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold text-foreground">Judge activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4 font-semibold">Judge</th>
                <th className="pb-2 pr-4 font-semibold">Completed</th>
                <th className="pb-2 pr-4 font-semibold">Marks recorded</th>
                <th className="pb-2 font-semibold">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {judgeActivity.map((row) => (
                <tr key={row.judge.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-foreground">{row.judge.name}</div>
                    <div className="text-xs text-muted-foreground">{row.judge.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-foreground">
                      {row.done}/{submissions.length} ({row.percent}%)
                    </div>
                    <div className="mt-1 w-32">
                      <ProgressBar value={row.percent} tone="magenta" />
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{row.marks}</td>
                  <td className="py-3 text-muted-foreground">
                    {row.last ? new Date(row.last).toLocaleDateString() : "No activity yet"}
                  </td>
                </tr>
              ))}
              {judgeActivity.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    Invite judges to see their activity here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">Weighted standings</h2>
          <span className="text-xs text-muted-foreground">
            Each criterion counts for its own weight, not a plain sum.
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {leaderboard.map((row) => (
            <div
              key={row.submission.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Pill tone={row.rank === null ? "gray" : "magenta"}>
                    {row.rank === null ? "Unscored" : `#${row.rank}`}
                  </Pill>
                  <span className="truncate font-semibold text-foreground">
                    {row.submission.title}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.submission.team_name ?? "Individual entry"} · {row.judgeCount} judge
                  {row.judgeCount === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-xl font-bold text-foreground">
                {row.percent === null ? "—" : `${row.percent}%`}
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Standings appear once submissions are scored.
            </p>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
