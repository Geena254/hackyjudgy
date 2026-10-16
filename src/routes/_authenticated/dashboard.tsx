import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  Trophy,
  Plus,
  Layers,
  Upload,
} from "lucide-react";
import { AppShell, Card, Button, Pill, ProgressBar } from "@/components/app-shell";
import { useAuth, initials } from "@/hooks/use-auth";
import { AdminResults } from "@/components/admin-results";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSubmissions,
  useAllScores,
  useJudges,
  criteriaForSubmission,
  scoreMap,
  daysLeft,
  formatDate,
  STATUS_LABELS,
} from "@/lib/hackathon";
import { rankStandings } from "@/lib/results";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Organiser Dashboard — GavelLab" },
      {
        name: "description",
        content: "Live overview of entries, judge activity and scoring progress for your hackathon.",
      },
      { property: "og:title", content: "Organiser Dashboard — GavelLab" },
      {
        property: "og:description",
        content: "Track entries, judges and scoring progress in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Metric({
  label,
  value,
  sub,
  progress,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  tone: "teal" | "magenta";
}) {
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {sub && <div className="text-sm text-muted-foreground">{sub}</div>}
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <ProgressBar value={progress} tone={tone} />
        </div>
      )}
    </Card>
  );
}

function StatusCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "teal" | "magenta";
  hint?: string;
}) {
  const color = tone === "teal" ? "var(--teal)" : "var(--magenta)";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div
          className="grid h-10 w-10 place-items-center rounded-md"
          style={{ background: tone === "teal" ? "var(--teal-soft)" : "var(--magenta-soft)" }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="text-3xl font-bold" style={{ color }}>
          {value}
        </div>
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function Dashboard() {
  const { isAdmin, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/judge", replace: true });
  }, [ready, isAdmin, navigate]);

  const { data: events = [] } = useEvents();
  const event = events.find((e) => e.status === "active") ?? events[0];
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: subs = [] } = useSubmissions(event?.id);
  const { data: scores = [] } = useAllScores();
  const { data: judges = [] } = useJudges();

  const progress = useMemo(() => {
    if (subs.length === 0 || judges.length === 0) return 0;
    let done = 0;
    for (const s of subs) {
      const crit = criteriaForSubmission(s, rounds, criteria);
      if (crit.length === 0) continue;
      for (const j of judges) {
        const vals = scoreMap(scores, s.id, j.id);
        if (crit.every((c) => vals[c.id] !== undefined)) done += 1;
      }
    }
    return Math.round((done / (subs.length * judges.length)) * 100);
  }, [subs, judges, rounds, criteria, scores]);

  const judgeProgress = useMemo(
    () =>
      judges
        .map((j) => {
          const scored = subs.filter((s) => {
            const crit = criteriaForSubmission(s, rounds, criteria);
            if (crit.length === 0) return false;
            const vals = scoreMap(scores, s.id, j.id);
            return crit.every((c) => vals[c.id] !== undefined);
          }).length;
          return { ...j, scored };
        })
        .sort((a, b) => b.scored - a.scored),
    [judges, subs, rounds, criteria, scores],
  );

  const left = daysLeft(event?.ends_on);

  // Entry status from actual scoring: how many judges have finished each entry.
  const entryStatus = useMemo(() => {
    let notStarted = 0;
    let underReview = 0;
    let fullyScored = 0;
    for (const s of subs) {
      const crit = criteriaForSubmission(s, rounds, criteria);
      const anyScore = scores.some((x) => x.submission_id === s.id && judges.some((j) => j.id === x.judge_id));
      const finished = judges.filter((j) => {
        const vals = scoreMap(scores, s.id, j.id);
        return crit.length > 0 && crit.every((c) => vals[c.id] !== undefined);
      }).length;
      if (judges.length > 0 && finished === judges.length) fullyScored += 1;
      else if (anyScore) underReview += 1;
      else notStarted += 1;
    }
    return { notStarted, underReview, fullyScored };
  }, [subs, rounds, criteria, scores, judges]);

  const judgesFinished = judgeProgress.filter((j) => subs.length > 0 && j.scored === subs.length).length;
  const leader = useMemo(
    () => rankStandings(subs, criteria, rounds, scores, judges.map((j) => j.id))[0],
    [subs, criteria, rounds, scores, judges],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Event overview
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {event?.name ?? "No hackathon yet"}
            </h1>
            {event && (
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(event.starts_on)} – {formatDate(event.ends_on)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {event && (
              <Pill tone={event.status === "active" ? "teal" : "gray"}>{event.status}</Pill>
            )}
            <Link to="/events">
              <Button variant="outline" tone="teal">
                <Plus className="h-4 w-4" strokeWidth={2} /> New hackathon
              </Button>
            </Link>
            <Link to="/submissions">
              <Button variant="outline" tone="teal">
                <Upload className="h-4 w-4" strokeWidth={2} /> Add entries
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" tone="teal">
                <Layers className="h-4 w-4" strokeWidth={2} /> Rounds &amp; rubric
              </Button>
            </Link>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Entry status</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              icon={<Inbox className="h-5 w-5" strokeWidth={2} />}
              label="Entries submitted"
              value={subs.length}
              hint={event ? event.name : undefined}
              tone="teal"
            />
            <StatusCard
              icon={<Clock className="h-5 w-5" strokeWidth={2} />}
              label="Awaiting judges"
              value={entryStatus.notStarted}
              hint="No scores yet"
              tone="magenta"
            />
            <StatusCard
              icon={<Eye className="h-5 w-5" strokeWidth={2} />}
              label={STATUS_LABELS.under_review}
              value={entryStatus.underReview}
              hint="Some judges still scoring"
              tone="magenta"
            />
            <StatusCard
              icon={<CheckCircle2 className="h-5 w-5" strokeWidth={2} />}
              label="Fully scored"
              value={entryStatus.fullyScored}
              hint={`Scored by all ${judges.length} judges`}
              tone="teal"
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Judges on the panel"
              value={`${judges.length}`}
              sub={`${judgesFinished} finished`}
              tone="magenta"
            />
            <Metric
              label="Scoring progress"
              value={`${progress}%`}
              progress={progress}
              tone="teal"
            />
            <Card className="p-5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Trophy className="h-4 w-4" style={{ color: "var(--teal)" }} strokeWidth={2} /> Leading team
              </div>
              <div className="mt-2 truncate text-xl font-bold text-foreground">
                {leader?.weightedTotal != null ? leader.submission.title : "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                {leader?.weightedTotal != null
                  ? `${leader.weightedTotal} / 100${leader.tied ? " · tied" : ""}`
                  : "No scores yet"}
              </div>
            </Card>
            <Metric
              label="Days left"
              value={left === null ? "—" : `${Math.max(0, left)}`}
              tone="magenta"
            />
          </div>
        </div>

        <AdminResults
          event={event}
          rounds={rounds}
          criteria={criteria}
          subs={subs}
          scores={scores}
          judges={judges}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Latest entries</h2>
            <ul className="space-y-3">
              {subs.slice(0, 8).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{s.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.team_name ?? s.submitter_name ?? "—"}
                      {s.category ? ` · ${s.category}` : ""}
                    </div>
                  </div>
                  <Pill tone="gray">{STATUS_LABELS[s.status]}</Pill>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.created_at.slice(0, 10))}
                  </span>
                </li>
              ))}
              {subs.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  No entries yet — publish the hackathon and share the entry page.
                </li>
              )}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Judge progress</h2>
            <ul className="space-y-3">
              {judgeProgress.map((j) => (
                <li key={j.id} className="flex items-center gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ background: "var(--teal)" }}
                  >
                    {initials(j.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{j.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {j.scored} of {subs.length} scored
                    </div>
                  </div>
                  <Pill tone="teal" variant="outline">
                    {j.scored}
                  </Pill>
                </li>
              ))}
              {judges.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  No judges yet — invite them from the Judges page.
                </li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
