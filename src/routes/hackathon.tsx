import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Trophy } from "lucide-react";
import { Card, Button, Pill, ProgressBar } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";
import {
  useActiveEvent,
  useRounds,
  useCriteria,
  useSubmitProject,
  usePublicSubmissions,
  usePublicScores,
  buildStandings,
  formatDate,
  daysLeft,
} from "@/lib/hackathon";

export const Route = createFileRoute("/hackathon")({
  head: () => ({
    meta: [
      { title: "Hackathon Home — Enter and Follow Live Standings | EvalDesk" },
      {
        name: "description",
        content:
          "The official page for our live hackathon: read the brief, submit your project, and follow live standings ranked on a weighted judging rubric.",
      },
      { property: "og:title", content: "Hackathon Home — Enter and Follow Live Standings" },
      {
        property: "og:description",
        content:
          "Submit your hackathon project and watch the live leaderboard, ranked by weighted rubric scores from the judging panel.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hackyjudgy.lovable.app/hackathon" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://hackyjudgy.lovable.app/hackathon" }],
  }),
  component: HackathonPage,
});

function Field({
  label,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function HackathonPage() {
  const { data: event, isLoading } = useActiveEvent();
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: submissions = [] } = usePublicSubmissions(event?.id);
  const { data: scores = [] } = usePublicScores(event?.id);
  const submit = useSubmitProject();

  const [doneId, setDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    team_name: "",
    category: "",
    description: "",
    submitter_name: "",
    submitter_email: "",
    repo_url: "",
    demo_url: "",
    deck_url: "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const standings = useMemo(
    () => buildStandings(submissions, criteria, scores, rounds),
    [submissions, criteria, scores, rounds],
  );
  const scored = standings.filter((s) => s.weightedTotal !== null);
  const left = daysLeft(event?.ends_on);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!event) return;
    const submissionRound = rounds.find((r) => r.phase === "submissions") ?? rounds[0];
    try {
      const id = await submit.mutateAsync({
        event_id: event.id,
        round_id: submissionRound?.id ?? null,
        ...form,
      });
      setDoneId(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="EvalDesk home">
            <PlpLogo className="h-10 sm:h-11" />
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="#standings"
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:inline-flex"
            >
              Live standings
            </a>
            <a
              href="#enter"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Enter now <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        {isLoading && <Card className="p-8 text-sm text-muted-foreground">Loading…</Card>}

        {!isLoading && !event && (
          <Card className="p-8">
            <h1 className="text-3xl font-bold text-foreground">No hackathon running right now</h1>
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
            {/* Hero */}
            <section className="border-l-4 pl-5 sm:pl-7" style={{ borderColor: "var(--magenta)" }}>
              <Pill tone="teal" variant="outline">
                {left !== null && left >= 0 ? `${left} days left to enter` : "Judging in progress"}
              </Pill>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                {event.name}
              </h1>
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--magenta)" }}>
                {formatDate(event.starts_on)} – {formatDate(event.ends_on)}
              </p>
              {event.description && (
                <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                  {event.description}
                </p>
              )}
              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Projects entered", value: String(submissions.length) },
                  { label: "Projects scored", value: `${scored.length}/${submissions.length}` },
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
                  Every criterion carries its own weight. Your final position is a weighted total —
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
                          Scored 1–{c.max_score || 5} by each judge
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
                <h2 className="text-2xl font-bold text-foreground">Live standings</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Ranked on the weighted rubric total, refreshed as judges score. Open a row to see
                how many points each criterion contributed to that project's total.
              </p>

              {standings.length === 0 ? (
                <Card className="mt-6 p-6 text-sm text-muted-foreground">
                  No projects entered yet — be the first on the board.
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
                            {s.rank ?? "–"}
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
                                Unweighted average of the same scores: {s.simpleTotal}% — the
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
              {doneId ? (
                <Card className="mt-6 p-6">
                  <CheckCircle2
                    className="h-9 w-9"
                    style={{ color: "var(--teal)" }}
                    strokeWidth={2}
                  />
                  <h3 className="mt-3 text-xl font-bold text-foreground">Entry received</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your project is with the judging panel for {event.name}. It will appear in the
                    standings above once judges start scoring.
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
                  <form onSubmit={onSubmit} className="space-y-4">
                    <Field
                      label="Project title"
                      required
                      value={form.title}
                      onChange={set("title")}
                      placeholder="e.g. AgriTrack"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Team name" value={form.team_name} onChange={set("team_name")} />
                      <Field
                        label="Category"
                        value={form.category}
                        onChange={set("category")}
                        placeholder="e.g. AgriTech"
                      />
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-foreground">
                        Project description
                      </span>
                      <textarea
                        required
                        rows={5}
                        value={form.description}
                        onChange={set("description")}
                        placeholder="What problem does it solve, who is it for, and what did you build?"
                        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Your name"
                        required
                        value={form.submitter_name}
                        onChange={set("submitter_name")}
                      />
                      <Field
                        label="Your email"
                        type="email"
                        required
                        value={form.submitter_email}
                        onChange={set("submitter_email")}
                        hint="Only the organisers and judges can see this."
                      />
                    </div>
                    <Field
                      label="Code repository link"
                      type="url"
                      value={form.repo_url}
                      onChange={set("repo_url")}
                      placeholder="https://github.com/..."
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Demo video or live link"
                        type="url"
                        value={form.demo_url}
                        onChange={set("demo_url")}
                      />
                      <Field
                        label="Pitch deck link"
                        type="url"
                        value={form.deck_url}
                        onChange={set("deck_url")}
                      />
                    </div>
                    {error && (
                      <p className="text-sm" style={{ color: "var(--magenta)" }}>
                        {error}
                      </p>
                    )}
                    <Button type="submit" variant="primary" tone="teal" disabled={submit.isPending}>
                      {submit.isPending ? "Sending…" : "Submit project"}
                    </Button>
                  </form>
                </Card>
              )}
            </section>

            <section className="mt-14 rounded-lg border border-border bg-surface p-6">
              <h2 className="text-xl font-bold text-foreground">Running your own hackathon?</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                EvalDesk gives you rounds, a weighted rubric, blind judging and standings like the
                ones above.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/auth"
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
