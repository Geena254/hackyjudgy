import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AppShell, Card, Pill, ProgressBar } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useEvents,
  useRounds,
  useSubmissions,
  useJudges,
  useAllReviews,
  formatDate,
  daysLeft,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Admin Portal — GavelLab" },
      {
        name: "description",
        content:
          "One place for organisers to see the whole platform: live hackathons, entries, judging progress and every public page.",
      },
      { property: "og:title", content: "Admin Portal — GavelLab" },
      { property: "og:description", content: "See the whole platform at a glance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPortal,
});

const publicPages = [
  { path: "/", label: "Landing page", note: "What visitors see first" },
  { path: "/submit", label: "Project entry form", note: "Where teams submit" },
  { path: "/how-to-organize-a-hackathon", label: "Organiser guide", note: "Public article" },
  { path: "/auth", label: "Sign in page", note: "Judges and organisers" },
];

const adminPages = [
  { to: "/dashboard" as const, label: "Dashboard" },
  { to: "/events" as const, label: "Hackathon setup" },
  { to: "/submissions" as const, label: "Entries" },
  { to: "/judges" as const, label: "Judging panel" },
  { to: "/analytics" as const, label: "Analytics" },
  { to: "/integrations" as const, label: "Agent integrations" },
  { to: "/settings" as const, label: "Settings" },
];

function AdminPortal() {
  const { isAdmin, ready } = useAuth();
  const { data: events = [] } = useEvents();
  const active = events.find((e) => e.status === "active") ?? events[0];
  const { data: rounds = [] } = useRounds(active?.id);
  const { data: submissions = [] } = useSubmissions(active?.id);
  const { data: judges = [] } = useJudges();
  const { data: reviews = [] } = useAllReviews();

  if (ready && !isAdmin) {
    return (
      <AppShell>
        <Card className="p-8 text-sm text-muted-foreground">
          This portal is for event organisers only.
        </Card>
      </AppShell>
    );
  }

  const expected = submissions.length * Math.max(judges.length, 1);
  const done = reviews.filter((r) => r.completed).length;
  const progress = expected > 0 ? Math.round((done / expected) * 100) : 0;
  const left = daysLeft(active?.ends_on);

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Organiser
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Admin portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything running on your site, in one view.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground">
              {active ? active.name : "No hackathon yet"}
            </h2>
            {active && <Pill tone={active.status === "active" ? "teal" : "gray"}>{active.status}</Pill>}
          </div>
          {active ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(active.starts_on)} – {formatDate(active.ends_on)}
                {left !== null && left >= 0 ? ` · ${left} day${left === 1 ? "" : "s"} left` : ""}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Entries", submissions.length],
                  ["Rounds", rounds.length],
                  ["Judges", judges.length],
                  ["Reviews done", done],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-xl font-bold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Scoring progress</span>
                  <span>{progress}%</span>
                </div>
                <ProgressBar value={progress} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Create and publish a hackathon on the setup page to open entries.
            </p>
          )}
          <div className="mt-6">
            <Link
              to="/events"
              className="inline-flex rounded-md px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--teal)" }}
            >
              {active ? "Manage hackathon" : "Create a hackathon"}
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground">Public pages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open any page exactly as visitors see it.
          </p>
          <ul className="mt-4 space-y-2">
            {publicPages.map((p) => (
              <li key={p.path}>
                <a
                  href={p.path}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-3 rounded-md border border-border px-4 py-3 text-sm hover:bg-muted"
                >
                  <span className="flex-1">
                    <span className="block font-semibold text-foreground">{p.label}</span>
                    <span className="block text-xs text-muted-foreground">{p.note}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground">Project showcase links</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every entry has its own public page teams can share.
          </p>
          <ul className="mt-4 space-y-2">
            {submissions.slice(0, 8).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {s.title}
                </span>
                <a
                  href={`/project/${s.id}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm font-semibold"
                  style={{ color: "var(--teal)" }}
                >
                  Open page
                </a>
              </li>
            ))}
            {submissions.length === 0 && (
              <li className="text-sm text-muted-foreground">No entries yet.</li>
            )}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-foreground">Organiser tools</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {adminPages.map((p) => (
              <li key={p.to}>
                <Link
                  to={p.to}
                  className="block rounded-md border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
