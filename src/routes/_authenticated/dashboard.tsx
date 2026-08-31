import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Eye,
  Star,
  Trophy,
  Plus,
  Upload,
  Layers,
  CircleDot,
  AlertTriangle,
  Activity,
  UserPlus,
  Pencil,
} from "lucide-react";
import { AppShell, Card, Button, Pill, ProgressBar } from "@/components/app-shell";
import { activity } from "@/lib/eval-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EvalDesk" },
      {
        name: "description",
        content: "Admin overview of submissions, judges and scoring progress for TechHack 2026.",
      },
      { property: "og:title", content: "Dashboard — EvalDesk" },
      {
        property: "og:description",
        content: "Track submissions, judge activity and scoring progress in one place.",
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
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  tone: "teal" | "magenta";
  warn?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div
          className="text-3xl font-bold"
          style={warn ? { color: "var(--destructive)" } : undefined}
        >
          {value}
        </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "teal" | "magenta";
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
    </Card>
  );
}

function activityIcon(kind: (typeof activity)[number]["kind"]) {
  const cls = "h-4 w-4";
  switch (kind) {
    case "scored":
      return <Star className={cls} style={{ color: "var(--teal)" }} strokeWidth={2} />;
    case "new":
      return <CircleDot className={cls} style={{ color: "var(--magenta)" }} strokeWidth={2} />;
    case "warning":
      return <AlertTriangle className={cls} style={{ color: "#8a6d00" }} strokeWidth={2} />;
    case "join":
      return <UserPlus className={cls} style={{ color: "var(--teal)" }} strokeWidth={2} />;
    case "edit":
      return <Pencil className={cls} style={{ color: "var(--magenta)" }} strokeWidth={2} />;
  }
}

function Dashboard() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Event overview
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">TechHack 2026</h1>
          </div>
          <Pill tone="teal">Active</Pill>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Submissions" value="24" sub="/ 30" progress={80} tone="teal" />
          <Metric label="Judges Active" value="8" sub="/ 10" progress={80} tone="magenta" />
          <Metric label="Scoring Progress" value="45%" progress={45} tone="teal" />
          <Metric label="Days Left" value="3" tone="magenta" warn />
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" tone="teal">
              <Plus className="h-4 w-4" strokeWidth={2} /> New Event
            </Button>
            <Button variant="outline" tone="teal">
              <Upload className="h-4 w-4" strokeWidth={2} /> Import Submissions
            </Button>
            <Button variant="outline" tone="teal">
              <Layers className="h-4 w-4" strokeWidth={2} /> View Rounds
            </Button>
          </div>
        </Card>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Submission status</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              icon={<CheckCircle2 className="h-5 w-5" strokeWidth={2} />}
              label="Submitted"
              value={24}
              tone="teal"
            />
            <StatusCard
              icon={<Eye className="h-5 w-5" strokeWidth={2} />}
              label="Under Review"
              value={8}
              tone="magenta"
            />
            <StatusCard
              icon={<Star className="h-5 w-5" strokeWidth={2} />}
              label="Scored"
              value={12}
              tone="teal"
            />
            <StatusCard
              icon={<Trophy className="h-5 w-5" strokeWidth={2} />}
              label="Ranked"
              value={6}
              tone="magenta"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Activity
                  className="h-5 w-5"
                  style={{ color: "var(--teal)" }}
                  strokeWidth={2}
                />
                Recent activity
              </h2>
            </div>
            <ul className="space-y-4">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    style={{ background: "var(--surface)" }}
                  >
                    {activityIcon(a.kind)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-foreground">{a.text}</p>
                      {a.kind === "warning" && <Pill tone="warning">Closing soon</Pill>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Top judges</h2>
            <ul className="space-y-3">
              {[
                { name: "Sarah Mitchell", scored: 8 },
                { name: "James Rodriguez", scored: 5 },
                { name: "Emily Watson", scored: 2 },
              ].map((j) => (
                <li key={j.name} className="flex items-center gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ background: "var(--teal)" }}
                  >
                    {j.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{j.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {j.scored} submissions scored
                    </div>
                  </div>
                  <Pill tone="teal" variant="outline">
                    {j.scored}
                  </Pill>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
