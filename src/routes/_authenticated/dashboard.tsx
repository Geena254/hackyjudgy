import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  ExternalLink,
  FolderOpen,
  Gavel,
  Inbox,
  Layers,
  Medal,
  Plus,
  Rocket,
  Scale,
  Trophy,
  Upload,
  User,
  Users,
} from "lucide-react";
import { AppShell, Card, Button, Pill, ProgressBar } from "@/components/app-shell";
import { useAuth, displayName, initials } from "@/hooks/use-auth";
import { useSelectedEvent } from "@/hooks/use-selected-event";
import { AdminResults } from "@/components/admin-results";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSubmissions,
  useAllScores,
  useJudges,
  useAssignments,
  useNow,
  panelFor,
  useOrganisers,
  criteriaForSubmission,
  scoreMap,
  daysLeft,
  formatDate,
  formatDateTime,
  submissionsClosed,
  timeUntil,
  STATUS_LABELS,
  type SubmissionRow,
} from "@/lib/hackathon";
import { judgingRubric, rankStandings } from "@/lib/results";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Organiser Dashboard - GavelLab" },
      {
        name: "description",
        content:
          "Live overview of entries, judge activity and scoring progress for your hackathon.",
      },
      { property: "og:title", content: "Organiser Dashboard - GavelLab" },
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

type Tone = "teal" | "magenta";
type EntryProgress = "not_started" | "under_review" | "scored";

const soft = (tone: Tone) => (tone === "teal" ? "var(--teal-soft)" : "var(--magenta-soft)");
const solid = (tone: Tone) => (tone === "teal" ? "var(--teal)" : "var(--magenta)");

const PROGRESS_LABEL: Record<EntryProgress, string> = {
  not_started: "Awaiting judges",
  under_review: STATUS_LABELS.under_review,
  scored: "Fully scored",
};

function IconTile({
  icon: Icon,
  tone,
  size = "md",
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: Tone;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={
        "grid shrink-0 place-items-center rounded-lg " + (size === "sm" ? "h-9 w-9" : "h-10 w-10")
      }
      style={{ background: soft(tone), color: solid(tone) }}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} />
    </span>
  );
}

function StatTile({
  icon,
  value,
  label,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  label: string;
  sub?: string;
  tone: Tone;
}) {
  return (
    <Card className="p-4">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sub && (
        <div className="mt-1 truncate text-xs font-medium" style={{ color: solid(tone) }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span style={{ color: "var(--teal)" }}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

function ViewAll({ to, hash, label = "View all" }: { to: string; hash?: string; label?: string }) {
  return (
    <Link
      to={to}
      hash={hash}
      className="inline-flex items-center gap-1 text-sm font-semibold"
      style={{ color: "var(--teal)" }}
    >
      {label} <ArrowRight className="h-4 w-4" strokeWidth={2} />
    </Link>
  );
}

function EntryCard({
  entry,
  progress,
  index,
}: {
  entry: SubmissionRow;
  progress: EntryProgress;
  index: number;
}) {
  const tone: Tone = index % 2 === 0 ? "teal" : "magenta";
  const members = (entry.team_member_emails ?? []).length + 1;
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold"
          style={{ background: soft(tone), color: solid(tone) }}
        >
          {initials(entry.title)}
        </span>
        <Pill
          tone={progress === "scored" ? "teal" : progress === "under_review" ? "magenta" : "gray"}
          variant="outline"
        >
          {PROGRESS_LABEL[progress]}
        </Pill>
      </div>
      <div className="mt-3 truncate text-sm font-bold text-foreground">{entry.title}</div>
      <div className="truncate text-xs text-muted-foreground">
        {entry.team_name ?? entry.submitter_name ?? " - "}
        {entry.category ? ` · ${entry.category}` : ""}
      </div>
      <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
        {entry.description || "No description given."}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {members > 1 ? (
            <Users className="h-4 w-4" strokeWidth={2} />
          ) : (
            <User className="h-4 w-4" strokeWidth={2} />
          )}
          {members > 1 ? `${members} members` : "Solo"}
        </span>
        <Link
          to="/project/$id"
          params={{ id: entry.id }}
          aria-label={`Open the project page for ${entry.title}`}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, isAdmin, isPlatformAdmin, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/judge", replace: true });
  }, [ready, isAdmin, navigate]);

  const { data: events = [], isSuccess: eventsLoaded } = useEvents();
  const [event, setEvent] = useSelectedEvent(events);
  // The platform admin sees every organiser's hackathons, so label who runs each one.
  const { data: organisers = {} } = useOrganisers(
    isPlatformAdmin ? events.map((e) => e.created_by) : [],
  );
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: subs = [] } = useSubmissions(event?.id);
  const { data: scores = [] } = useAllScores();
  const { data: judges = [] } = useJudges(event?.id);
  // Once entries are shared out, each entry only expects the judge it was given to.
  const { data: assignments = [] } = useAssignments(event?.id);
  const panel = useMemo(() => panelFor(assignments), [assignments]);
  const now = useNow();

  const progress = useMemo(() => {
    let expected = 0;
    let done = 0;
    for (const s of subs) {
      const crit = criteriaForSubmission(s, rounds, criteria);
      for (const j of panel.judgesOf(s.id, judges)) {
        expected += 1;
        const vals = scoreMap(scores, s.id, j.id);
        if (crit.length > 0 && crit.every((c) => vals[c.id] !== undefined)) done += 1;
      }
    }
    return expected === 0 ? 0 : Math.round((done / expected) * 100);
  }, [subs, judges, rounds, criteria, scores, panel]);

  const judgeProgress = useMemo(
    () =>
      judges
        .map((j) => {
          const share = subs.filter((s) => panel.expects(j.id, s.id));
          const scored = share.filter((s) => {
            const crit = criteriaForSubmission(s, rounds, criteria);
            if (crit.length === 0) return false;
            const vals = scoreMap(scores, s.id, j.id);
            return crit.every((c) => vals[c.id] !== undefined);
          }).length;
          return { ...j, scored, share: share.length };
        })
        .sort((a, b) => b.scored - a.scored),
    [judges, subs, rounds, criteria, scores, panel],
  );

  // Entry status from actual scoring: how many judges have finished each entry.
  const entryProgress = useMemo(() => {
    const byEntry = new Map<string, EntryProgress>();
    for (const s of subs) {
      const crit = criteriaForSubmission(s, rounds, criteria);
      const expected = panel.judgesOf(s.id, judges);
      const anyScore = scores.some(
        (x) => x.submission_id === s.id && expected.some((j) => j.id === x.judge_id),
      );
      const finished = expected.filter((j) => {
        const vals = scoreMap(scores, s.id, j.id);
        return crit.length > 0 && crit.every((c) => vals[c.id] !== undefined);
      }).length;
      byEntry.set(
        s.id,
        expected.length > 0 && finished === expected.length
          ? "scored"
          : anyScore
            ? "under_review"
            : "not_started",
      );
    }
    return byEntry;
  }, [subs, rounds, criteria, scores, judges, panel]);

  const entryStatus = useMemo(() => {
    const counts = { notStarted: 0, underReview: 0, fullyScored: 0 };
    for (const p of entryProgress.values()) {
      if (p === "scored") counts.fullyScored += 1;
      else if (p === "under_review") counts.underReview += 1;
      else counts.notStarted += 1;
    }
    return counts;
  }, [entryProgress]);

  const judgesFinished = judgeProgress.filter((j) => j.share > 0 && j.scored === j.share).length;
  const standings = useMemo(
    () =>
      rankStandings(
        subs,
        criteria,
        rounds,
        scores,
        judges.map((j) => j.id),
      ),
    [subs, criteria, rounds, scores, judges],
  );
  const leaders = standings.filter((s) => s.weightedTotal != null).slice(0, 5);

  // Panel average for each rubric criterion, across every scored entry.
  const rubric = useMemo(() => {
    const list = judgingRubric(rounds, criteria);
    const panelIds = new Set(judges.map((j) => j.id));
    const totalWeight = list.reduce((sum, c) => sum + (c.weight || 0), 0);
    return list.map((c) => {
      const values = scores
        .filter((s) => s.criterion_id === c.id && panelIds.has(s.judge_id))
        .map((s) => Number(s.value));
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return {
        criterion: c,
        share: totalWeight ? Math.round(((c.weight || 0) / totalWeight) * 100) : 0,
        avg,
      };
    });
  }, [rounds, criteria, scores, judges]);

  const closeAt = event?.submissions_close_at;
  const closed = !!event && submissionsClosed(event, now);
  const closesIn = timeUntil(closeAt, now);
  const left = daysLeft(event?.ends_on);
  const firstName = displayName(user).replace(/@.*/, "").split(/\s+/)[0];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome and headline numbers */}
        {/* Tiles sit beside the heading only on very wide screens, so long names never truncate. */}
        <div className="grid grid-cols-1 items-start gap-6 min-[1700px]:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: "var(--teal)" }}>
              Welcome back{firstName ? `, ${firstName}` : ""}!
            </div>
            {event && events.length > 1 ? (
              <div className="relative mt-1">
                <label htmlFor="dashboard-event" className="sr-only">
                  Choose hackathon
                </label>
                <select
                  id="dashboard-event"
                  value={event.id}
                  onChange={(e) => setEvent(e.target.value)}
                  className="max-w-full cursor-pointer appearance-none truncate rounded-md border border-transparent bg-transparent py-1 pr-9 text-2xl font-bold text-foreground hover:border-border hover:bg-background focus:border-[color:var(--teal)] focus:outline-none sm:text-3xl"
                >
                  {events.map((e) => {
                    const by = e.created_by ? organisers[e.created_by] : undefined;
                    return (
                      <option key={e.id} value={e.id} className="text-base font-normal">
                        {e.name} ({e.status}){by ? ` · by ${by}` : ""}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={2}
                />
              </div>
            ) : (
              <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                {event?.name ?? "No hackathon yet"}
              </h1>
            )}
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {event
                ? `${formatDate(event.starts_on)} - ${formatDate(event.ends_on)}. Follow new entries, judging progress and the standings as your hackathon takes shape.`
                : "Create a hackathon to start taking entries."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {event && (
                <Pill tone={event.status === "active" ? "teal" : "gray"}>{event.status}</Pill>
              )}
              {event && !event.show_live_rankings && (
                <Pill tone="gray" variant="outline">
                  Rankings private
                </Pill>
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 min-[1700px]:w-[640px]">
            <StatTile
              icon={Inbox}
              value={String(subs.length)}
              label="Total entries"
              sub={`${entryStatus.notStarted} awaiting judges`}
              tone="teal"
            />
            <StatTile
              icon={Users}
              value={String(judges.length)}
              label="Judges on the panel"
              sub={`${judgesFinished} finished`}
              tone="magenta"
            />
            <StatTile
              icon={Trophy}
              value={`${progress}%`}
              label="Scoring progress"
              sub={progress === 100 ? "Complete" : progress > 0 ? "In progress" : "Not started"}
              tone="teal"
            />
            <StatTile
              icon={Clock}
              value={
                closeAt
                  ? (closesIn ?? "Closed")
                  : left === null
                    ? " - "
                    : `${Math.max(0, left)} days`
              }
              label={closeAt ? "Until submissions close" : "Days left"}
              sub={
                closeAt
                  ? `${closed ? "Closed" : "Ends"} ${formatDateTime(closeAt)}`
                  : event?.ends_on
                    ? `Ends ${formatDate(event.ends_on)}`
                    : undefined
              }
              tone="magenta"
            />
          </div>
        </div>

        {eventsLoaded && events.length === 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground">
              Welcome to your organiser workspace
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              This is where you run your hackathons. Only you can see your hackathons&apos; entries,
              judges and scores here. Start by creating your first hackathon, then invite your
              judges by email.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/events">
                <Button variant="primary" tone="teal">
                  <Plus className="h-4 w-4" strokeWidth={2} /> Create your first hackathon
                </Button>
              </Link>
              <Link to="/judges">
                <Button variant="outline" tone="teal">
                  Invite judges
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Entries */}
          <Card className="p-5">
            <SectionHeader
              icon={FolderOpen}
              title="Project submissions"
              action={
                <Link to="/submissions">
                  <Button variant="outline" tone="teal" className="px-3 py-1.5 text-xs">
                    View all entries <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </Button>
                </Link>
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The latest entries and where each one is in judging. Open one to see its project page.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="gray" variant="outline">
                {entryStatus.notStarted} awaiting judges
              </Pill>
              <Pill tone="magenta" variant="outline">
                {entryStatus.underReview} under review
              </Pill>
              <Pill tone="teal" variant="outline">
                {entryStatus.fullyScored} fully scored
              </Pill>
            </div>
            {subs.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {subs.slice(0, 6).map((s, i) => (
                  <EntryCard
                    key={s.id}
                    entry={s}
                    index={i}
                    progress={entryProgress.get(s.id) ?? "not_started"}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No entries yet - publish the hackathon and share the entry page.
              </p>
            )}
          </Card>

          <div className="space-y-6">
            {/* Rubric averages */}
            <Card className="p-5">
              <SectionHeader
                icon={Scale}
                title="Judging scoreboard"
                action={<ViewAll to="/analytics" />}
              />
              <ul className="mt-4 space-y-4">
                {rubric.map(({ criterion: c, share, avg }) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <IconTile icon={Gavel} tone="teal" size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {c.name}
                        </span>
                        <span
                          className="shrink-0 text-xs font-semibold"
                          style={{ color: "var(--teal)" }}
                        >
                          {share}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {c.description || "Weighted rubric criterion"}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-foreground">
                          {avg === null ? " - " : avg.toFixed(1)} / {c.max_score}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={avg === null ? 0 : (avg / c.max_score) * 100} />
                      </div>
                    </div>
                  </li>
                ))}
                {rubric.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    No rubric yet - add criteria under Rounds &amp; rubric.
                  </li>
                )}
              </ul>
            </Card>

            {/* Standings */}
            <Card className="p-5">
              <SectionHeader
                icon={Trophy}
                title="Leaderboard"
                action={<ViewAll to="/dashboard" hash="results" />}
              />
              {leaders.length > 0 ? (
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="w-8 pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Project / team</th>
                      <th className="pb-2 text-right font-medium">Judges</th>
                      <th className="pb-2 text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaders.map((s) => (
                      <tr key={s.submission.id}>
                        <td className="py-2.5">
                          {s.rank !== null && s.rank <= 3 ? (
                            <Medal
                              className="h-4 w-4"
                              strokeWidth={2}
                              style={{ color: s.rank === 1 ? "var(--teal)" : "var(--magenta)" }}
                            />
                          ) : (
                            <span className="text-muted-foreground">{s.rank}</span>
                          )}
                        </td>
                        <td className="max-w-0 py-2.5">
                          <div className="truncate font-semibold text-foreground">
                            {s.submission.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.submission.team_name ?? " - "}
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">{s.judgeCount}</td>
                        <td className="py-2.5 text-right font-semibold text-foreground">
                          {s.weightedTotal}
                          {s.tied ? "*" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No scores yet - the standings appear once judges start scoring.
                </p>
              )}
            </Card>

            {/* Judges */}
            <Card className="p-5">
              <SectionHeader
                icon={Users}
                title="Judge progress"
                action={<ViewAll to="/judges" />}
              />
              <ul className="mt-4 space-y-3">
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
                        {j.scored} of {j.share} scored
                        {panel.sharedOut ? " (their share)" : ""}
                      </div>
                    </div>
                    <Pill tone="teal" variant="outline">
                      {j.scored}
                    </Pill>
                  </li>
                ))}
                {judges.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    No judges yet - invite them from the Judges page.
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </div>

        {/* Where the hackathon stands */}
        {event && (
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <IconTile icon={Rocket} tone="teal" />
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold text-foreground">
                {closed
                  ? "Submission round closed - judging is live"
                  : closeAt
                    ? `Submissions close in ${closesIn}`
                    : "Submissions are open"}
              </div>
              <p className="text-sm text-muted-foreground">
                {closed
                  ? `Entries stopped on ${formatDateTime(closeAt)}. Judges are scoring now - check the results to see who is leading.`
                  : closeAt
                    ? `Participants can enter until ${formatDateTime(closeAt)}. You can extend this in Hackathon setup.`
                    : "Set a closing date and time in Hackathon setup to close the submission round automatically."}
              </p>
            </div>
            <Link to={closed ? "/dashboard" : "/events"} hash={closed ? "results" : undefined}>
              <Button variant="primary" tone="magenta">
                {closed ? "View results" : "Submission settings"}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Button>
            </Link>
          </Card>
        )}

        <div id="results" className="scroll-mt-24">
          <AdminResults
            event={event}
            rounds={rounds}
            criteria={criteria}
            subs={subs}
            scores={scores}
            judges={judges}
          />
        </div>
      </div>
    </AppShell>
  );
}
