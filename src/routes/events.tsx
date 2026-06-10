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
  Trash2,
  X,
} from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { rounds as seedRounds, type RoundCfg } from "@/lib/eval-data";

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

const PHASES: RoundCfg["phase"][] = ["Submissions", "Judging", "Results"];

interface RoundConfig extends RoundCfg {
  criteria: { id: string; name: string; weight: number }[];
}

const seedConfig: RoundConfig[] = seedRounds.map((r) => ({
  ...r,
  criteria: [
    { id: `${r.id}-c1`, name: "Originality", weight: 25 },
    { id: `${r.id}-c2`, name: "Feasibility", weight: 25 },
    { id: `${r.id}-c3`, name: "User Experience", weight: 25 },
    { id: `${r.id}-c4`, name: "Impact & Scale", weight: 25 },
  ],
}));

function EventSetup() {
  const [tab, setTab] = useState<Tab>("rounds");

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Event setup
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">TechHack 2026</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
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
          <Button variant="primary" tone="teal">Save changes</Button>
        </div>
      </div>
    </Card>
  );
}

function RoundsTab() {
  const [rounds, setRounds] = useState<RoundConfig[]>(seedConfig);
  const [expanded, setExpanded] = useState<string | null>("r2");
  const [creating, setCreating] = useState(false);

  const addRound = (r: RoundConfig) => {
    setRounds((prev) => [...prev, r]);
    setExpanded(r.id);
    setCreating(false);
  };

  const updateRound = (id: string, patch: Partial<RoundConfig>) =>
    setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRound = (id: string) =>
    setRounds((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rounds</h2>
          <p className="text-sm text-muted-foreground">
            {rounds.length} round{rounds.length === 1 ? "" : "s"} configured
          </p>
        </div>
        <Button variant="primary" tone="teal" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" strokeWidth={2} /> Add Round
        </Button>
      </div>

      {creating && (
        <NewRoundForm
          existingCount={rounds.length}
          onCancel={() => setCreating(false)}
          onCreate={addRound}
        />
      )}

      {rounds.map((r) => {
        const open = expanded === r.id;
        return (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold" style={{ color: "var(--teal)" }}>
                    {r.name}
                  </h3>
                  <Pill tone="teal" variant="outline">{r.phase}</Pill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.deadline}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pill tone="magenta">{r.method}</Pill>
                  <Pill tone="gray" variant="outline">
                    {r.criteria.length} criteria
                  </Pill>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => removeRound(r.id)}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-[color:var(--magenta)]"
                  aria-label="Delete round"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setExpanded(open ? null : r.id)}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                  aria-label={open ? "Collapse" : "Expand"}
                >
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {open && (
              <div className="mt-5 space-y-5 border-t border-border pt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Round name
                    </label>
                    <input
                      value={r.name}
                      onChange={(e) => updateRound(r.id, { name: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Phase
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PHASES.map((p) => {
                        const active = r.phase === p;
                        return (
                          <button
                            key={p}
                            onClick={() => updateRound(r.id, { phase: p })}
                            className="rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
                            style={
                              active
                                ? { background: "var(--teal)", borderColor: "var(--teal)", color: "#fff" }
                                : { borderColor: "var(--border)", color: "var(--foreground)" }
                            }
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Deadline
                    </label>
                    <input
                      value={r.deadline}
                      onChange={(e) => updateRound(r.id, { deadline: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Submission method
                    </label>
                    <input
                      value={r.method}
                      onChange={(e) => updateRound(r.id, { method: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
                    />
                  </div>
                </div>

                <CriteriaEditor
                  criteria={r.criteria}
                  onChange={(criteria) => updateRound(r.id, { criteria })}
                />
              </div>
            )}
          </Card>
        );
      })}

      {rounds.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No rounds yet. Click <strong className="text-foreground">Add Round</strong> to create one.
          </p>
        </Card>
      )}
    </div>
  );
}

function NewRoundForm({
  existingCount,
  onCancel,
  onCreate,
}: {
  existingCount: number;
  onCancel: () => void;
  onCreate: (r: RoundConfig) => void;
}) {
  const [name, setName] = useState(`Round ${existingCount + 1}`);
  const [phase, setPhase] = useState<RoundCfg["phase"]>("Judging");
  const [deadline, setDeadline] = useState("Closes June 30, 2026");
  const [method, setMethod] = useState("Google Forms");

  const submit = () => {
    if (!name.trim()) return;
    const id = `r${Date.now()}`;
    onCreate({
      id,
      name: name.trim(),
      phase,
      deadline,
      method,
      criteria: [
        { id: `${id}-c1`, name: "Originality", weight: 50 },
        { id: `${id}-c2`, name: "Impact", weight: 50 },
      ],
    });
  };

  return (
    <Card className="p-5" style={{ borderColor: "var(--teal)" } as React.CSSProperties}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">New round</h3>
        <button
          onClick={onCancel}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Round name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Phase</label>
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p) => {
              const active = phase === p;
              return (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                  style={
                    active
                      ? { background: "var(--teal)", borderColor: "var(--teal)", color: "#fff" }
                      : { borderColor: "var(--border)", color: "var(--foreground)" }
                  }
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Deadline</label>
          <input
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Submission method
          </label>
          <input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" tone="magenta" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" tone="teal" onClick={submit}>Create round</Button>
      </div>
    </Card>
  );
}

function CriteriaEditor({
  criteria,
  onChange,
}: {
  criteria: { id: string; name: string; weight: number }[];
  onChange: (next: { id: string; name: string; weight: number }[]) => void;
}) {
  const total = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const balanced = total === 100;

  const update = (id: string, patch: Partial<{ name: string; weight: number }>) =>
    onChange(criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const remove = (id: string) => onChange(criteria.filter((c) => c.id !== id));

  const add = () =>
    onChange([
      ...criteria,
      { id: `c${Date.now()}`, name: "New criterion", weight: 0 },
    ]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Rubric criteria</h4>
          <p className="text-xs text-muted-foreground">
            Each criterion is scored 1–5.{" "}
            <span style={{ color: balanced ? "var(--teal)" : "var(--magenta)" }}>
              Weights total {total}%
            </span>
          </p>
        </div>
        <Button variant="outline" tone="teal" onClick={add}>
          <Plus className="h-4 w-4" strokeWidth={2} /> Add criterion
        </Button>
      </div>
      <ul className="space-y-2">
        {criteria.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3"
          >
            <input
              value={c.name}
              onChange={(e) => update(c.id, { name: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-[color:var(--teal)]"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={c.weight}
                onChange={(e) => update(c.id, { weight: Number(e.target.value) })}
                className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-[color:var(--teal)]"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <button
                onClick={() => remove(c.id)}
                className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-[color:var(--magenta)]"
                aria-label="Remove criterion"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {criteria.length === 0 && (
          <li className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No criteria yet. Add one to begin scoring this round.
          </li>
        )}
      </ul>
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
      <h2 className="text-lg font-semibold text-foreground">Default rubric</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Used as a starting template for new rounds. Each criterion is scored on a 1–5 scale.
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
            <Pill tone="teal" variant="outline">{c.weight}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}
