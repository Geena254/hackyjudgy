import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PlpLogo, SiteFooter } from "@/components/brand";
import { Pill } from "@/components/app-shell";

export const Route = createFileRoute("/how-to-organize-a-hackathon")({
  head: () => ({
    meta: [
      { title: "How to Organize a Hackathon: Step-by-Step Guide" },
      {
        name: "description",
        content:
          "A practical guide to organizing a hackathon: planning and setup, submissions, judging rubrics, blind judging, and running a judge portal that scores fairly.",
      },
      { property: "og:title", content: "How to Organize a Hackathon: Step-by-Step Guide" },
      {
        property: "og:description",
        content:
          "Plan, run and judge a hackathon end to end — setup checklist, rubric design, blind judging and judge portal tips.",
      },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: "https://hackyjudgy.lovable.app/how-to-organize-a-hackathon",
      },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://hackyjudgy.lovable.app/how-to-organize-a-hackathon",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Organize a Hackathon: Step-by-Step Guide",
          description:
            "A practical guide to planning, running and judging a hackathon, including rubric design and blind judging.",
          mainEntityOfPage:
            "https://hackyjudgy.lovable.app/how-to-organize-a-hackathon",
        }),
      },
    ],
  }),
  component: GuidePage,
});

const setupSteps = [
  {
    title: "1. Set the goal and theme",
    body: "Decide what the hackathon should produce — prototypes for a specific problem, learning outcomes for a cohort, or recruitment signal. Write it in one sentence and use it to judge every later decision. A narrow theme makes submissions comparable and judging far quicker.",
  },
  {
    title: "2. Fix the format and dates",
    body: "Choose in-person, online or hybrid, then lock the start, submission deadline, judging window and results announcement. Publish all four dates at launch. Leave at least 24 hours between the submission deadline and the results, so judges are not scoring under pressure.",
  },
  {
    title: "3. Set the rules and eligibility",
    body: "State team size, who can enter, what participants may build in advance, which licences are allowed, and how AI tools may be used. Ambiguous rules become disputes at judging time, so publish them alongside registration.",
  },
  {
    title: "4. Budget, venue and prizes",
    body: "Cost out venue or platform, connectivity, food, mentor time and prizes. Prizes should reward the outcomes named in your goal — a best-first-time-team prize signals something very different from a single grand prize.",
  },
  {
    title: "5. Recruit mentors and judges early",
    body: "Invite judges before you promote the event, not after. Aim for a mix of technical and product perspectives, and confirm how many hours each judge can give — that number decides how many submissions each of them can realistically score.",
  },
  {
    title: "6. Open a single submission channel",
    body: "Collect every project through one form with the same required fields: title, team, description, repository link, demo video and deck. One channel means no lost entries and no manual copying into spreadsheets before judging.",
  },
  {
    title: "7. Plan the run of the day",
    body: "Publish a schedule: kick-off, mentoring checkpoints, submission cut-off, demos, judging and announcement. Checkpoints catch teams who have drifted off-brief while there is still time to correct.",
  },
];

const judgingSteps = [
  {
    title: "Design the rubric before judging opens",
    body: "Four to six criteria is the sweet spot — for example originality, technical feasibility, user experience, and impact. Define each one in a sentence so two judges reading it reach the same conclusion.",
  },
  {
    title: "Weight the criteria deliberately",
    body: "Weights are where your goal becomes maths. A learning-focused hackathon might weight originality and user experience highly; a client-brief event weights feasibility and impact. Publish the weights with the rules.",
  },
  {
    title: "Use a fixed scale on every criterion",
    body: "A 1–5 scale with short descriptions for each point reduces drift between judges. Avoid open-ended totals — they make scores impossible to compare across a panel.",
  },
  {
    title: "Run rounds instead of one giant pass",
    body: "A screening round on completeness, then a scoring round, then a final round for the shortlist. Each round can carry its own criteria, so judges spend their deepest attention on the strongest entries.",
  },
  {
    title: "Turn on blind judging",
    body: "Hiding team and submitter names while scoring removes the pull of familiar names and reputations. Reveal identities only when standings are final.",
  },
  {
    title: "Require written feedback",
    body: "A score without a comment teaches a team nothing. Ask each judge for a short note per submission — it also gives you a defensible record if a result is questioned.",
  },
  {
    title: "Agree how ties break",
    body: "Decide in advance: highest score on the heaviest criterion, or a short panel discussion. Deciding after the fact always looks arbitrary.",
  },
];

const portalTips = [
  "Give every judge their own account instead of a shared login, so scores and comments are attributable.",
  "Let judges score from a queue with a Save & Next action — they should never hunt for the submission they have not reached.",
  "Show progress per judge, so you can nudge the panel before the deadline rather than after it.",
  "Autosave feedback as judges type; judging sessions get interrupted.",
  "Keep private notes separate from feedback that participants may see.",
  "Compute weighted totals and ranks automatically — manual spreadsheet maths is where results go wrong.",
  "Share final scores, ranks and feedback back to each judge so the panel can sanity-check standings together.",
];

function GuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <PlpLogo className="h-10 sm:h-11" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--teal)" }}
          >
            Get started <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <Pill tone="teal" variant="outline">
            Organiser guide
          </Pill>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            How to organize a hackathon
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Running a hackathon is two jobs: getting good projects built, and judging them
            fairly. This guide walks through the planning steps in order, then the judging
            decisions that decide whether your results hold up — the same decisions EvalDesk
            was built around for Power Learn Project hackathons.
          </p>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-foreground">Part 1: Setup and planning</h2>
            <div className="mt-6 space-y-6">
              {setupSteps.map((s) => (
                <div key={s.title} className="border-l-2 pl-5" style={{ borderColor: "var(--teal)" }}>
                  <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-foreground">Part 2: Judging that holds up</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Most hackathon complaints are about judging, not the build. These steps remove
              the usual causes: vague criteria, inconsistent scales and invisible progress.
            </p>
            <div className="mt-6 space-y-6">
              {judgingSteps.map((s) => (
                <div
                  key={s.title}
                  className="border-l-2 pl-5"
                  style={{ borderColor: "var(--magenta)" }}
                >
                  <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold text-foreground">
              Part 3: Running a judging portal
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              However you collect scores, a judging portal should make the panel's work
              obvious and the results reproducible.
            </p>
            <ul className="mt-6 space-y-3">
              {portalTips.map((tip) => (
                <li key={tip} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--teal)" }}
                    strokeWidth={2}
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14 rounded-lg border border-border bg-surface p-6">
            <h2 className="text-xl font-bold text-foreground">Run your judging on EvalDesk</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your event and rounds, invite judges by email, and let them score every
              submission against a weighted rubric with blind judging on.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white"
                style={{ background: "var(--teal)" }}
              >
                Create your account <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Submit a project
              </Link>
            </div>
          </section>
        </article>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-10 sm:px-6">
          <PowerCommunityMark className="h-8" />
          <p className="text-xs text-muted-foreground">
            EvalDesk — judging and scoring for Power Learn Project hackathons.
          </p>
        </div>
      </footer>
    </div>
  );
}
