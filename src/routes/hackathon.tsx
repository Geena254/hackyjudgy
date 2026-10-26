import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, EyeOff, FileText, Trophy } from "lucide-react";
import { Card, Pill, ProgressBar } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";
import { EntryForm, SubmissionsClosedNotice } from "@/components/entry-form";
import {
  useNow,
  submissionsClosed,
  timeUntil,
  usePublicEvents,
  useRounds,
  useCriteria,
  usePublicSubmissions,
  usePublicScores,
  buildStandings,
  formatDate,
  daysLeft,
} from "@/lib/hackathon";

export const Route = createFileRoute("/hackathon")({
  validateSearch: (s: Record<string, unknown>): { event?: string } =>
    typeof s.event === "string" ? { event: s.event } : {},
  head: () => ({
    meta: [
      { title: "Hackathons - Enter and Follow Live Standings | GavelLab" },
      {
        name: "description",
        content:
          "Browse every live hackathon on GavelLab: read the brief, submit your project, and follow live standings ranked on a weighted judging rubric.",
      },
      { property: "og:title", content: "Hackathons - Enter and Follow Live Standings" },
      {
        property: "og:description",
        content:
          "Submit your hackathon project and watch the live leaderboard, ranked by weighted rubric scores from the judging panel.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gavellab.lovable.app/hackathon" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://gavellab.lovable.app/hackathon" }],
  }),
  component: HackathonPage,
});

function HackathonPage() {
  const { event: selectedId } = Route.useSearch();
  const { data: events = [], isLoading } = usePublicEvents();
  // Without a choice in the URL, open the most recently launched hackathon.
  const newest = events.reduce<(typeof events)[number] | null>(
    (best, e) => (!best || e.created_at > best.created_at ? e : best),
    null,
  );
  const event = events.find((e) => e.id === selectedId) ?? newest;
  const showRankings = event?.show_live_rankings ?? true;
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: submissions = [] } = usePublicSubmissions(event?.id);
  const { data: scores = [] } = usePublicScores(event?.id);

  const [doneId, setDoneId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Switching hackathon starts from a clean slate for that event.
  useEffect(() => {
    setDoneId(null);
    setOpenId(null);
  }, [event?.id]);

  const standings = useMemo(
    () => buildStandings(submissions, criteria, scores, rounds),
    [submissions, criteria, scores, rounds],
  );
  const scored = standings.filter((s) => s.weightedTotal !== null);
  const left = daysLeft(event?.ends_on);
  const now = useNow();
  const closed = !!event && submissionsClosed(event, now);
  const closesIn = timeUntil(event?.submissions_close_at, now);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="GavelLab home">
            <PlpLogo className="h-10 sm:h-11" />
          </Link>
          <div className="flex items-center gap-2">
            {events.length > 1 && (
              <a
                href="#hackathons"
                className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:inline-flex"
              >
                All hackathons
              </a>
            )}
            {showRankings && (
              <a
                href="#standings"
                className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:inline-flex"
              >
                Live standings
              </a>
            )}
            {!closed && (
              <a
                href="#enter"
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--teal)" }}
              >
                Enter now <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        {isLoading && <Card className="p-8 text-sm text-muted-foreground">Loading…</Card>}

        {!isLoading && !event && (
          <Card className="p-8">
            <h1 className="text-3xl font-bold text-foreground">No hackathons running right now</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The next hackathon has not been opened yet. In the meantime, read our guide to
              setting up and judging a hackathon.
            </p>
            <Link
              to="/how-to-organize-a-hackathon"
              className="mt-6 inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Read the guide <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </Card>
        )}

        {!isLoading && event && (
          <>
            {/* Every published hackathon on the platform */}
            {events.length > 1 && (
              <section id="hackathons" className="mb-14 scroll-mt-20">
                <h2 className="text-2xl font-bold text-foreground">Hackathons on GavelLab</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {events.length} hackathons are open right now. Pick one to read its brief, follow
                  its standings and enter your project.
                </p>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((e) => {
                    const selected = e.id === event.id;
                    const remaining = daysLeft(e.ends_on);
                    return (
                      <li key={e.id}>
                        <Link
                          to="/hackathon"
                          search={{ event: e.id }}
                          aria-current={selected ? "page" : undefined}
                          className="block h-full rounded-lg border bg-card p-5 hover:bg-muted"
                          style={{
                            borderColor: selected ? "var(--teal)" : "var(--border)",
                            boxShadow: selected ? "inset 0 0 0 1px var(--teal)" : undefined,
                          }}
                        >
                          <Pill tone={selected ? "teal" : "gray"}>
                            {submissionsClosed(e, now)
                              ? "Submissions closed"
                              : remaining !== null && remaining >= 0
                                ? `${remaining} days left`
                                : "Judging in progress"}
                          </Pill>
                          <h3 className="mt-3 text-base font-bold text-foreground">{e.name}</h3>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={2} />
                            {formatDate(e.starts_on)} - {formatDate(e.ends_on)}
                          </p>
                          {e.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {e.description}
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Hero */}
            <section className="border-l-4 pl-5 sm:pl-7" style={{ borderColor: "var(--magenta)" }}>
              <Pill tone={closed ? "gray" : "teal"} variant="outline">
                {closed
                  ? "Submission round closed"
                  : closesIn
                    ? `Submissions close in ${closesIn}`
                    : left !== null && left >= 0
                      ? `${left} days left to enter`
                      : "Judging in progress"}
              </Pill>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                {event.name}
              </h1>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--magenta)" }}>
                {formatDate(event.starts_on)} - {formatDate(event.ends_on)}
              </p>
              {event.description && (
                <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                  {event.description}
                </p>
              )}
              {event.brief_url && (
                <a
                  href={event.brief_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <FileText className="h-4 w-4" style={{ color: "var(--teal)" }} strokeWidth={2} />
                  Read the concept note
                </a>
              )}
              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Projects entered", value: String(submissions.length) },
                  showRankings
                    ? { label: "Projects scored", value: `${scored.length}/${submissions.length}` }
                    : { label: "Closes", value: formatDate(event.ends_on) },
                  { label: "Rubric criteria", value: String(criteria.length) },
                ].map((m) => (
                  <Card key={m.label} className="p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {m.label}
                    </dt>
                    <dd className="mt-1 text-2xl font-bold" style={{ color: "var(--teal)" }}>
                      {m.value}
                    </dd>
                  </Card>
                ))}
              </dl>
            </section>

            {/* Rounds */}
            {rounds.length > 0 && (
              <section className="mt-14">
                <h2 className="text-2xl font-bold text-foreground">How the hackathon runs</h2>
                <ol className="mt-5 grid gap-4 sm:grid-cols-3">
                  {rounds.map((r) => (
                    <li key={r.id}>
                      <Card className="h-full p-5">
                        <Pill tone={r.phase === "judging" ? "magenta" : "gray"}>{r.phase}</Pill>
                        <h3 className="mt-3 text-base font-bold text-foreground">{r.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Deadline {formatDate(r.deadline)}
                        </p>
                        {r.submission_method && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {r.submission_method}
                          </p>
                        )}
                      </Card>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Rubric */}
            {criteria.length > 0 && (
              <section className="mt-14">
                <h2 className="text-2xl font-bold text-foreground">
                  What the judges score you on
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Every criterion carries its own weight. Your final position is a weighted total - 
                  each criterion's average score is scaled by its weight, so heavier criteria move
                  the ranking more than lighter ones.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {criteria.map((c) => {
                    const total = criteria.reduce((sum, x) => sum + (x.weight || 0), 0) || 1;
                    const share = Math.round(((c.weight || 0) / total) * 100);
                    return (
                      <Card key={c.id} className="p-5">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="text-base font-bold text-foreground">{c.name}</h3>
                          <span
                            className="shrink-0 text-sm font-bold"
                            style={{ color: "var(--magenta)" }}
                          >
                            {share}% of total
                          </span>
                        </div>
                        {c.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                        )}
                        <div className="mt-3">
                          <ProgressBar value={share} tone="magenta" />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Scored 1-{c.max_score || 5} by each judge
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Live standings */}
            <section id="standings" className="mt-14 scroll-mt-20">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6" style={{ color: "var(--teal)" }} strokeWidth={2} />
                <h2 className="text-2xl font-bold text-foreground">
                  {showRankings ? "Live standings" : "Standings"}
                </h2>
              </div>
              {showRankings && (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Ranked on the weighted rubric total, refreshed as judges score. Open a row to see
                  how many points each criterion contributed to that project's total.
                </p>
              )}

              {!showRankings ? (
                <Card className="mt-6 flex items-start gap-3 p-6 text-sm text-muted-foreground">
                  <EyeOff className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
                  <span>
                    The organisers are keeping rankings private while judging runs. Results will be
                    announced when judging closes. {submissions.length} project
                    {submissions.length === 1 ? " has" : "s have"} been entered so far.
                  </span>
                </Card>
              ) : standings.length === 0 ? (
                <Card className="mt-6 p-6 text-sm text-muted-foreground">
                  No projects entered yet - be the first on the board.
                </Card>
              ) : (
                <div className="mt-6 space-y-3">
                  {standings.map((s, i) => {
                    const open = openId === s.submission.id;
                    return (
                      <Card key={s.submission.id} className="overflow-hidden">
                        <button
                          onClick={() => setOpenId(open ? null : s.submission.id)}
                          className="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:bg-muted"
                        >
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                            style={{
                              background: i === 0 ? "var(--magenta)" : "var(--teal)",
                              opacity: s.rank === null ? 0.4 : 1,
                            }}
                          >
                            {s.rank ?? "-"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base font-bold text-foreground">
                              {s.submission.title}
                            </span>
                            <span className="block truncate text-sm text-muted-foreground">
                              {s.submission.team_name ?? "Independent entry"}
                              {s.submission.category ? ` · ${s.submission.category}` : ""}
                            </span>
                          </span>
                          <span className="text-right">
                            <span
                              className="block text-xl font-bold"
                              style={{ color: "var(--teal)" }}
                            >
                              {s.weightedTotal === null ? "Awaiting judges" : `${s.weightedTotal}%`}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              weighted total
                              {s.judgeCount > 0
                                ? ` · ${s.judgeCount} judge${s.judgeCount === 1 ? "" : "s"}`
                                : ""}
                            </span>
                          </span>
                        </button>

                        {open && (
                          <div className="border-t border-border p-4">
                            {s.simpleTotal !== null && (
                              <p className="text-xs text-muted-foreground">
                                Unweighted average of the same scores: {s.simpleTotal}% - the
                                difference is the effect of the rubric weights.
                              </p>
                            )}
                            <div className="mt-4 space-y-3">
                              {s.breakdown.map((b) => (
                                <div key={b.criterion.id}>
                                  <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="font-medium text-foreground">
                                      {b.criterion.name}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">
                                      {b.average === null
                                        ? "not scored"
                                        : `avg ${b.average.toFixed(1)}/${b.criterion.max_score || 5}`}
                                      {" · "}
                                      <strong className="text-foreground">
                                        {b.points} of {b.maxPoints} pts
                                      </strong>
                                    </span>
                                  </div>
                                  <div className="mt-1.5">
                                    <ProgressBar
                                      value={b.maxPoints ? (b.points / b.maxPoints) * 100 : 0}
                                      tone="teal"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <Link
                              to="/project/$id"
                              params={{ id: s.submission.id }}
                              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
                              style={{ color: "var(--magenta)" }}
                            >
                              View project page <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </Link>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Entry form */}
            <section id="enter" className="mt-14 scroll-mt-20">
              <h2 className="text-2xl font-bold text-foreground">Enter your project</h2>
              {closed && !doneId ? (
                <Card className="mt-6 p-6">
                  <SubmissionsClosedNotice event={event} />
                </Card>
              ) : doneId ? (
                <Card className="mt-6 p-6">
                  <CheckCircle2
                    className="h-9 w-9"
                    style={{ color: "var(--teal)" }}
                    strokeWidth={2}
                  />
                  <h3 className="mt-3 text-xl font-bold text-foreground">Entry received</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your project is with the judging panel for {event.name}.
                    {showRankings
                      ? " It will appear in the standings above once judges start scoring."
                      : " Results will be announced when judging closes."}
                  </p>
                  <Link
                    to="/project/$id"
                    params={{ id: doneId }}
                    className="mt-5 inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white"
                    style={{ background: "var(--teal)" }}
                  >
                    View my project page <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </Link>
                </Card>
              ) : (
                <Card className="mt-6 p-6">
                  <EntryForm
                    event={event}
                    rounds={rounds}
                    onDone={(id) => {
                      setDoneId(id);
                      document.getElementById("enter")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                </Card>
              )}
            </section>

            <section className="mt-14 rounded-lg border border-border bg-surface p-6">
              <h2 className="text-xl font-bold text-foreground">Running your own hackathon?</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                GavelLab gives you rounds, a weighted rubric, blind judging and standings like the
                ones above.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white"
                  style={{ background: "var(--magenta)" }}
                >
                  Create your account <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
                <Link
                  to="/how-to-organize-a-hackathon"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Hackathon setup &amp; judging guide
                </Link>
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
