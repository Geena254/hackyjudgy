import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Settings as SettingsIcon,
  Users,
  ClipboardList,
  FileText,
} from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { rounds } from "@/lib/eval-data";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Event Setup — EvalDesk" },
      { name: "description", content: "Configure event details, rounds, judges, and rubric." },
    ],
  }),
  component: EventSetup,
});

type Tab = "details" | "rounds" | "judges" | "rubric";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "details", label: "Event Details", icon: FileText },
  { id: "rounds", label: "Rounds", icon: ClipboardList },
  { id: "judges", label: "Judges", icon: Users },
  { id: "rubric", label: "Rubric", icon: SettingsIcon },
];

function EventSetup() {
  const [tab, setTab] = useState<Tab>("details");

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Event setup
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">TechHack 2026</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sidebar */}
        <Card className="h-fit p-2">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                    (active ? "bg-teal-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                  style={active ? { color: "var(--teal)" } : undefined}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Content */}
        <div className="min-w-0">
          {tab === "details" && <DetailsTab />}
          {tab === "rounds" && <RoundsTab />}
          {tab === "judges" && <JudgesTab />}
          {tab === "rubric" && <RubricTab />}
        </div>
      </div>
    </AppShell>
  );
}

function DetailsTab() {
  const [name, setName] = useState("TechHack 2026");
  const [desc, setDesc] = useState(
    "A 72-hour hackathon for students and early-career builders, judged across innovation, feasibility, UX, and impact.",
  );
  const [teal, setTeal] = useState("#00A69E");
  const [magenta, setMagenta] = useState("#C41E69");

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground">Event details</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Define the basics — name, description, branding.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Event name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)] focus:ring-2 focus:ring-[color:var(--teal)]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)] focus:ring-2 focus:ring-[color:var(--teal)]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Logo upload</label>
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-surface px-4 py-8 text-center">
            <span className="flex items-center">
              <span className="inline-block h-8 w-8 rounded-md" style={{ background: teal }} />
              <span
                className="-ml-2 inline-block h-8 w-8 rounded-md"
                style={{ background: magenta }}
              />
            </span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="h-4 w-4" strokeWidth={2} />
              Drop SVG or PNG, or
              <button className="font-semibold" style={{ color: "var(--teal)" }}>
                browse
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Primary teal
            </label>
            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <input
                type="color"
                value={teal}
                onChange={(e) => setTeal(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
              <span className="text-sm font-mono text-foreground">{teal.toUpperCase()}</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Primary magenta
            </label>
            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <input
                type="color"
                value={magenta}
                onChange={(e) => setMagenta(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
              <span className="text-sm font-mono text-foreground">{magenta.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" tone="teal">
            Save changes
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RoundsTab() {
  const [expanded, setExpanded] = useState<string | null>("r2");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Rounds</h2>
        <Button variant="primary" tone="teal">
          <Plus className="h-4 w-4" strokeWidth={2} /> Add Round
        </Button>
      </div>

      {rounds.map((r) => {
        const open = expanded === r.id;
        return (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold" style={{ color: "var(--teal)" }}>
                    {r.name}
                  </h3>
                  <Pill tone="teal" variant="outline">
                    {r.phase}
                  </Pill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.deadline}</p>
                <div className="mt-3">
                  <Pill tone="magenta">{r.method}</Pill>
                </div>
              </div>
              <button
                onClick={() => setExpanded(open ? null : r.id)}
                className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                aria-label={open ? "Collapse" : "Expand"}
              >
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" tone="teal">
                Configure Rubric
              </Button>
              <Button variant="outline" tone="magenta">
                Assign Judges
              </Button>
            </div>

            {open && (
              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <Stat label="Submissions" value={r.phase === "Submissions" ? "24" : "—"} />
                <Stat label="Judges assigned" value={r.phase === "Judging" ? "8" : "—"} />
                <Stat label="Weight" value="100%" />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

function JudgesTab() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground">Judges panel</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite judges and track their scoring progress.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Judge</th>
              <th className="py-2 pr-4">Scored</th>
              <th className="py-2 pr-4">Pending</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Sarah Mitchell", scored: 8, pending: 0 },
              { name: "James Rodriguez", scored: 5, pending: 3 },
              { name: "Emily Watson", scored: 0, pending: 2 },
            ].map((j) => (
              <tr key={j.name} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-foreground">{j.name}</td>
                <td className="py-3 pr-4 text-foreground">{j.scored}</td>
                <td className="py-3 pr-4 text-foreground">{j.pending}</td>
                <td className="py-3 pr-4">
                  {j.pending === 0 ? (
                    <Pill tone="teal">Complete</Pill>
                  ) : (
                    <Pill tone="magenta">In progress</Pill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RubricTab() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground">Rubric</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each criterion is scored on a 1–5 scale.
      </p>
      <ul className="mt-5 divide-y divide-border">
        {[
          { name: "Originality", weight: "25%" },
          { name: "Feasibility", weight: "25%" },
          { name: "User Experience", weight: "25%" },
          { name: "Impact & Scale", weight: "25%" },
        ].map((c) => (
          <li key={c.name} className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-foreground">{c.name}</div>
              <div className="text-xs text-muted-foreground">1–5 scale</div>
            </div>
            <Pill tone="teal" variant="outline">
              {c.weight}
            </Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}
