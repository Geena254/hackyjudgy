import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  EyeOff,
  ListChecks,
  Scale,
  Trophy,
  Users,
} from "lucide-react";
import { Card, Pill } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";

export const Route = createFileRoute("/for-organisers")({
  head: () => ({
    meta: [
      { title: "Hackathon Judging Software for Organisers | GavelLab" },
      {
        name: "description",
        content:
          "Run a hackathon end to end: rounds, a weighted judging rubric, blind judging, invited judges and live standings. Set up your first hackathon on GavelLab in minutes.",
      },
      { property: "og:title", content: "Hackathon Judging Software for Organisers | GavelLab" },
      {
        property: "og:description",
        content:
          "Rounds, weighted rubrics, blind judging, judge invitations and live standings — everything you need to judge a hackathon fairly.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gavellab.lovable.app/for-organisers" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://gavellab.lovable.app/for-organisers" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "GavelLab",
          applicationCategory: "BusinessApplication",
          description:
            "Hackathon judging and scoring platform with rounds, weighted rubrics, blind judging and live standings.",
          url: "https://gavellab.lovable.app/for-organisers",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: OrganisersPage,
});

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Rounds with real deadlines",
    body: "Set up submission, judging and finals rounds, each with its own deadline and submission method, so entrants always know what is due next.",
  },
  {
    icon: Scale,
    title: "Weighted judging rubric",
    body: "Give every criterion its own weight and maximum. Final position is a weighted total, so impact can count for more than polish.",
  },
  {
    icon: Users,
    title: "Invite judges by email",
    body: "Add judges by email address and they get an invitation to join your panel. They only ever see their own scoring queue.",
  },
  {
    icon: EyeOff,
    title: "Blind judging",
    body: "Hide team and submitter names while scoring, so judges are rating the work rather than the reputation behind it.",
  },
  {
    icon: Trophy,
    title: "Live standings",
    body: "A public board updates as scores come in, with a per-criterion breakdown showing exactly what moved each project up or down.",
  },
  {
    icon: ListChecks,
    title: "Progress you can chase",
    body: "See scoring progress per judge and per project, so you know who to nudge before the results announcement.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create your hackathon",
    body: "Name it, write the brief, set the dates and publish it. Your public page goes live immediately.",
  },
  {
    step: "2",
    title: "Set rounds and the rubric",
    body: "Add your rounds and the criteria judges will score, with a weight and maximum for each.",
  },
  {
    step: "3",
    title: "Invite your judges",
    body: "Send invitations by email. Judges sign up and land straight in their own scoring queue.",
  },
  {
    step: "4",
    title: "Collect entries and score",
    body: "Teams enter from your public page. Judges score, and the standings rank everyone on the weighted total.",
  },
];

function OrganisersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="GavelLab home">
            <PlpLogo className="h-10 sm:h-11" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/how-to-organize-a-hackathon"
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:inline-flex"
            >
              Read the guide
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Start free <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:py-16">
        <section className="border-l-4 pl-5 sm:pl-7" style={{ borderColor: "var(--magenta)" }}>
          <Pill tone="teal" variant="outline">
            For hackathon organisers
          </Pill>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Judge your hackathon fairly, and show the results as they happen
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            GavelLab gives you rounds, a weighted judging rubric, blind judging, invited judges and
            a public standings board — so scoring a hackathon takes an afternoon instead of a
            spreadsheet marathon.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              Set up your hackathon <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              to="/hackathon"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See a live hackathon page
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No card needed. Invite your judges the same day you sign up.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-foreground">
            Everything a hackathon panel needs
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full p-5">
                <f.icon className="h-6 w-6" style={{ color: "var(--teal)" }} strokeWidth={2} />
                <h3 className="mt-3 text-base font-bold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-foreground">From idea to results in four steps</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.step}>
                <Card className="h-full p-5">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ background: "var(--magenta)" }}
                  >
                    {s.step}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground">Why weighted scoring matters</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A plain sum treats a slick demo the same as real-world impact. With weights, each
              criterion's average score is scaled by how much it should count, and the standings
              show how many points every criterion contributed to a project's total. Judges and
              entrants can both see why a project placed where it did.
            </p>
            <Link
              to="/hackathon"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--magenta)" }}
            >
              Look at a live standings board <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground">Good for</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                "University and campus hackathons",
                "Company internal innovation days",
                "Community and bootcamp demo days",
                "Grant, pitch and award panels",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--teal)" }}
                    strokeWidth={2}
                  />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section
          className="mt-16 rounded-lg border-l-4 border border-border bg-surface p-8"
          style={{ borderLeftColor: "var(--teal)" }}
        >
          <h2 className="text-2xl font-bold text-foreground">Ready to run your hackathon?</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create your account, publish your hackathon page, and start collecting entries today.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-semibold text-white"
              style={{ background: "var(--magenta)" }}
            >
              Create your account <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              to="/how-to-organize-a-hackathon"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Hackathon setup &amp; judging guide
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
