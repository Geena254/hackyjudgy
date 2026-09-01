import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  Lock,
  Star,
  Trophy,
  Users,
  BarChart3,
} from "lucide-react";
import { Card, Pill } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EvalDesk — Hackathon Judging & Scoring by Power Learn Project" },
      {
        name: "description",
        content:
          "EvalDesk runs Power Learn Project hackathons end to end: rounds, rubrics, blind judging and live scoring in one place.",
      },
      { property: "og:title", content: "EvalDesk — Hackathon Judging & Scoring" },
      {
        property: "og:description",
        content:
          "Configure rounds and rubrics, invite judges by email, and score submissions fairly with blind judging.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Layers,
    title: "Rounds & rubrics",
    body: "Configure submission, judging and results phases, each with its own weighted rubric criteria.",
  },
  {
    icon: Users,
    title: "Invite judges by email",
    body: "Add judges with their email address and they receive an invitation to sign up and start scoring.",
  },
  {
    icon: Lock,
    title: "Blind judging",
    body: "Hide submitter identities during scoring so every project is evaluated on merit alone.",
  },
  {
    icon: Star,
    title: "Real-time scoring",
    body: "Scores, feedback and private notes save automatically as judges work through the queue.",
  },
  {
    icon: BarChart3,
    title: "Live progress",
    body: "Track submissions, judge activity and scoring completion from a single admin dashboard.",
  },
  {
    icon: Trophy,
    title: "Fair rankings",
    body: "Aggregate weighted criteria into final standings you can defend and publish with confidence.",
  },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <PlpLogo className="h-10 sm:h-11" />
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Get started <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <Pill tone="teal" variant="outline">
                Power Learn Project
              </Pill>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                Judge hackathons fairly, at scale.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                EvalDesk is the judging and scoring platform behind Power Learn Project
                hackathons. Set up events and rounds, invite your judge panel by email, and
                score every submission against a shared rubric.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white"
                  style={{ background: "var(--teal)" }}
                >
                  Create your account <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  I have an invitation
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No spreadsheets", "Blind judging built in", "Weighted rubrics"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2
                      className="h-4 w-4"
                      style={{ color: "var(--teal)" }}
                      strokeWidth={2}
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Everything a judging round needs
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <div
                  className="grid h-10 w-10 place-items-center rounded-md"
                  style={{ background: "var(--teal-soft)" }}
                >
                  <f.icon className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">How it works</h2>
            <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { n: "01", t: "Set up your event", d: "Create the event, add rounds and define rubric criteria with weights." },
                { n: "02", t: "Invite your judges", d: "Enter judge emails — each one gets an invitation to join the panel." },
                { n: "03", t: "Score and rank", d: "Judges score submissions; you watch progress and publish results." },
              ].map((s) => (
                <li key={s.n}>
                  <div className="text-sm font-bold" style={{ color: "var(--teal)" }}>
                    {s.n}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Card className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-foreground">Ready to run your next hackathon?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign up as an admin and invite your judge panel in minutes.
              </p>
            </div>
            <Link
              to="/auth"
              className="inline-flex shrink-0 items-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Get started <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
