import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock, ListChecks, Star } from "lucide-react";
import { AppShell, Card, Pill, ProgressBar } from "@/components/app-shell";
import { useAuth, displayName } from "@/hooks/use-auth";
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
  daysLeft,
  formatDate,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/judge")({
  head: () => ({
    meta: [
      { title: "Judge Dashboard — EvalDesk" },
      {
        name: "description",
        content: "Track your judging progress and the submissions assigned to you.",
      },
      { property: "og:title", content: "Judge Dashboard — EvalDesk" },
      { property: "og:description", content: "Your judging progress at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JudgeHome,
});

function JudgeHome() {
  const { user } = useAuth();
  const { data: events = [] } = useEvents();
  const event = events.find((e) => e.status === "active") ?? events[0];
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: subs = [] } = useSubmissions(event?.id);
  const { data: myScores = [] } = useMyScores(user?.id);
  const { data: myReviews = [] } = useMyReviews(user?.id);

  const rows = useMemo(
    () =>
      subs.map((s) => {
        const crit = criteriaForSubmission(s, rounds, criteria);
        const values = scoreMap(myScores, s.id, user?.id);
        const scored = crit.filter((c) => values[c.id] !== undefined).length;
        const review = myReviews.find((r) => r.submission_id === s.id);
        return {
          submission: s,
          total: crit.length,
          scored,
          percent: weightedPercent(crit, values),
          done: !!review?.completed || (crit.length > 0 && scored === crit.length),
        };
      }),
    [subs, rounds, criteria, myScores, myReviews, user?.id],
  );

  const completed = rows.filter((r) => r.done).length;
  const started = rows.filter((r) => !r.done && r.scored > 0).length;
  const progress = rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0;
  const avg = (() => {
    const vals = rows.map((r) => r.percent).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();
  const left = daysLeft(event?.ends_on);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Judge portal
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Welcome, {displayName(user)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {event
              ? `${event.name} · ${formatDate(event.starts_on)} – ${formatDate(event.ends_on)}`
              : "No hackathon has been published yet."}
          </p>
        </div>
        <Link
          to="/scoring"
          search={{ id: undefined }}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--teal)" }}
        >
          Continue scoring <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ListChecks} label="Assigned to me" value={`${rows.length}`} />
        <Stat icon={CheckCircle2} label="Completed" value={`${completed}`} />
        <Stat icon={Star} label="In progress" value={`${started}`} />
        <Stat
          icon={Clock}
          label="Days left"
          value={left === null ? "—" : `${Math.max(0, left)}`}
        />
      </div>

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">My scoring progress</h2>
          <span className="text-sm text-muted-foreground">
            {completed}/{rows.length} complete
            {avg !== null && <> · average score {avg}%</>}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar value={progress} />
        </div>
      </Card>

      <Card className="mt-6 p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">My assigned submissions</h2>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.submission.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {r.submission.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {r.submission.category && <Pill tone="gray">{r.submission.category}</Pill>}
                  <span>
                    {r.scored}/{r.total || "—"} criteria scored
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {r.percent === null ? "Not scored" : <strong className="text-foreground">{r.percent}%</strong>}
              </div>
              <Pill tone={r.done ? "teal" : "gray"}>{r.done ? "Complete" : "Pending"}</Pill>
              <Link
                to="/scoring"
                search={{ id: r.submission.id }}
                className="text-sm font-semibold"
                style={{ color: "var(--teal)" }}
              >
                Score
              </Link>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nothing to judge yet — submissions will appear here once the event opens.
            </li>
          )}
        </ul>
      </Card>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-md"
          style={{ background: "var(--teal-soft)" }}
        >
          <Icon className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
        </div>
      </div>
    </Card>
  );
}
