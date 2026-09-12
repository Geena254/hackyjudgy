import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FileText,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSaveEvent,
  useDeleteEvent,
  useSaveRound,
  useDeleteRound,
  useSaveCriterion,
  useDeleteCriterion,
  PHASES,
  formatDate,
  type EventRow,
  type Phase,
  type RoundRow,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Hackathon Setup — GavelLab" },
      {
        name: "description",
        content:
          "Create hackathons, publish them for entries, and configure rounds with their own weighted rubric criteria.",
      },
      { property: "og:title", content: "Hackathon Setup — GavelLab" },
      { property: "og:description", content: "Set up events, rounds and rubrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventSetup,
});

type Tab = "details" | "rounds" | "rubric";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "details", label: "Hackathon details", icon: FileText },
  { id: "rounds", label: "Rounds", icon: ClipboardList },
  { id: "rubric", label: "Rubric", icon: SettingsIcon },
];

const statusTone = (s: string) => (s === "active" ? "teal" : s === "closed" ? "gray" : "magenta");

function Text({
  label,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
      />
    </label>
  );
}

function EventSetup() {
  const { isAdmin, ready } = useAuth();
  const [tab, setTab] = useState<Tab>("details");
  const { data: events = [] } = useEvents();
  const [eventId, setEventId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!creating && !eventId && events.length > 0) setEventId(events[0]!.id);
  }, [events, eventId, creating]);

  const event = creating ? undefined : events.find((e) => e.id === eventId);

  if (ready && !isAdmin) {
    return (
      <AppShell>
        <Card className="p-8 text-sm text-muted-foreground">
          Only event organisers can configure hackathons.
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Organiser
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Hackathon setup</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={creating ? "" : (eventId ?? "")}
            onChange={(e) => {
              const value = e.target.value;
              setCreating(!value);
              setEventId(value || undefined);
              if (!value) setTab("details");
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            aria-label="Choose hackathon"
          >
            <option value="">
              {events.length === 0 ? "No hackathons yet" : "New hackathon…"}
            </option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.status})
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            tone="teal"
            onClick={() => {
              setCreating(true);
              setEventId(undefined);
              setTab("details");
            }}
          >
            <Plus className="h-4 w-4" /> New hackathon
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="h-fit p-2">
          <nav className="flex flex-row gap-1 lg:flex-col">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex flex-1 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium"
                  style={
                    active
                      ? { background: "var(--teal-soft)", color: "var(--teal)" }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  <t.icon className="h-4 w-4" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </Card>

        <div className="min-w-0 space-y-6">
          {tab === "details" && (
            <DetailsTab
              event={event}
              onCreated={(id) => {
                setCreating(false);
                setEventId(id);
              }}
              onDeleted={() => {
                setCreating(false);
                setEventId(undefined);
              }}
            />
          )}
          {tab !== "details" && !event && (
            <Card className="p-8 text-sm text-muted-foreground">
              Create a hackathon first, then add its rounds and rubric.
            </Card>
          )}
          {tab === "rounds" && event && <RoundsTab event={event} />}
          {tab === "rubric" && event && <RubricTab event={event} />}
        </div>
      </div>
    </AppShell>
  );
}

function DetailsTab({
  event,
  onCreated,
  onDeleted,
}: {
  event: EventRow | undefined;
  onCreated: (id: string) => void;
  onDeleted: () => void;
}) {
  const save = useSaveEvent();
  const remove = useDeleteEvent();
  const [form, setForm] = useState({
    name: "",
    description: "",
    starts_on: "",
    ends_on: "",
    status: "draft" as EventRow["status"],
  });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: event?.name ?? "",
      description: event?.description ?? "",
      starts_on: event?.starts_on ?? "",
      ends_on: event?.ends_on ?? "",
      status: event?.status ?? "draft",
    });
  }, [event?.id, event?.name, event?.description, event?.starts_on, event?.ends_on, event?.status]);

  async function submit(status?: EventRow["status"]) {
    const next = { ...form, status: status ?? form.status };
    setForm(next);
    const id = await save.mutateAsync({ id: event?.id, ...next });
    if (!event) onCreated(id);
    setNotice(status === "active" ? "Hackathon published — it now accepts entries." : "Saved.");
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">
          {event ? "Edit hackathon" : "New hackathon"}
        </h2>
        {event && <Pill tone={statusTone(event.status)}>{event.status}</Pill>}
      </div>

      <div className="space-y-4">
        <Text
          label="Hackathon name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. PLP Climate Hack 2026"
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Description</span>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Theme, who can enter, prizes and what participants must submit."
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text
            label="Starts on"
            type="date"
            value={form.starts_on}
            onChange={(e) => setForm({ ...form, starts_on: e.target.value })}
          />
          <Text
            label="Ends on"
            type="date"
            value={form.ends_on}
            onChange={(e) => setForm({ ...form, ends_on: e.target.value })}
          />
        </div>
        <label className="block sm:max-w-xs">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as EventRow["status"] })}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="draft">Draft (hidden)</option>
            <option value="active">Published (open for entries)</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      {notice && (
        <p className="mt-4 text-sm" style={{ color: "var(--teal)" }}>
          {notice}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="primary"
          tone="teal"
          disabled={!form.name || save.isPending}
          onClick={() => submit()}
        >
          {event ? "Save changes" : "Create hackathon"}
        </Button>
        {event && event.status !== "active" && (
          <Button variant="outline" tone="teal" onClick={() => submit("active")}>
            Publish
          </Button>
        )}
        {event && (
          <Button
            variant="ghost"
            tone="magenta"
            onClick={() => {
              if (confirm(`Delete "${event.name}" and all its rounds and entries?`))
                remove.mutate(event.id, { onSuccess: onDeleted });
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>
    </Card>
  );
}

function RoundsTab({ event }: { event: EventRow }) {
  const { data: rounds = [] } = useRounds(event.id);
  const saveRound = useSaveRound();
  const removeRound = useDeleteRound();
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("submissions");
  const [deadline, setDeadline] = useState("");
  const [method, setMethod] = useState("");

  async function add() {
    if (!name) return;
    await saveRound.mutateAsync({
      event_id: event.id,
      name,
      phase,
      deadline,
      submission_method: method,
      sort_order: rounds.length,
    });
    setName("");
    setDeadline("");
    setMethod("");
  }

  return (
    <>
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground">Add a round</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Text
            label="Round name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Round 1 — Screening"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Phase</span>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as Phase)}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <Text
            label="Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Text
            label="Submission method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="e.g. Repo link + 3-min demo video"
          />
        </div>
        <div className="mt-4">
          <Button variant="primary" tone="teal" onClick={add} disabled={!name || saveRound.isPending}>
            <Plus className="h-4 w-4" /> Add round
          </Button>
        </div>
      </Card>

      {rounds.map((r) => (
        <Card key={r.id} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground">{r.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Pill tone={r.phase === "judging" ? "teal" : "gray"}>{r.phase}</Pill>
                <span>Deadline {formatDate(r.deadline)}</span>
                {r.submission_method && <span>· {r.submission_method}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                tone="teal"
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
              >
                {openId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Edit
              </Button>
              <Button
                variant="ghost"
                tone="magenta"
                onClick={() => {
                  if (confirm(`Delete "${r.name}" and its rubric?`)) removeRound.mutate(r.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {openId === r.id && <RoundEditor round={r} />}
        </Card>
      ))}

      {rounds.length === 0 && (
        <Card className="p-8 text-sm text-muted-foreground">
          No rounds yet — add your first round above.
        </Card>
      )}
    </>
  );
}

function RoundEditor({ round }: { round: RoundRow }) {
  const save = useSaveRound();
  const [form, setForm] = useState({
    name: round.name,
    phase: round.phase,
    deadline: round.deadline ?? "",
    submission_method: round.submission_method ?? "",
  });
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Text
          label="Round name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Phase</span>
          <select
            value={form.phase}
            onChange={(e) => setForm({ ...form, phase: e.target.value as Phase })}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Text
          label="Deadline"
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
        <Text
          label="Submission method"
          value={form.submission_method}
          onChange={(e) => setForm({ ...form, submission_method: e.target.value })}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          tone="teal"
          onClick={async () => {
            await save.mutateAsync({ id: round.id, event_id: round.event_id, ...form });
            setSaved(true);
          }}
        >
          Save round
        </Button>
        {saved && (
          <span className="text-xs" style={{ color: "var(--teal)" }}>
            Saved
          </span>
        )}
      </div>
      <CriteriaEditor roundId={round.id} />
    </div>
  );
}

function CriteriaEditor({ roundId }: { roundId: string }) {
  const { data: criteria = [] } = useCriteria([roundId]);
  const save = useSaveCriterion();
  const remove = useDeleteCriterion();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState(25);
  const [maxScore, setMaxScore] = useState(5);

  const total = useMemo(() => criteria.reduce((sum, c) => sum + c.weight, 0), [criteria]);

  return (
    <div className="mt-6 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-foreground">Rubric criteria for this round</h4>
        <span
          className="text-xs font-semibold"
          style={{ color: total === 100 ? "var(--teal)" : "var(--magenta)" }}
        >
          Total weight {total}%
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {criteria.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{c.name}</div>
              {c.description && (
                <div className="truncate text-xs text-muted-foreground">{c.description}</div>
              )}
            </div>
            <input
              type="number"
              min={1}
              max={100}
              value={c.weight}
              onChange={(e) =>
                save.mutate({
                  id: c.id,
                  round_id: roundId,
                  name: c.name,
                  description: c.description,
                  weight: Number(e.target.value) || 0,
                  max_score: c.max_score,
                  sort_order: c.sort_order,
                })
              }
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
              aria-label={`Weight for ${c.name}`}
            />
            <span className="text-xs text-muted-foreground">% · max {c.max_score}</span>
            <button
              onClick={() => remove.mutate(c.id)}
              aria-label={`Remove ${c.name}`}
              className="rounded-md p-1.5 hover:bg-muted"
              style={{ color: "var(--magenta)" }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {criteria.length === 0 && (
          <li className="text-xs text-muted-foreground">
            No criteria yet — judges cannot score this round until you add some.
          </li>
        )}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Text label="Criterion" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Originality" />
        <Text
          label="Guidance for judges"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What a strong answer looks like"
        />
        <Text
          label="Weight (%)"
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value) || 0)}
        />
        <Text
          label="Max score"
          type="number"
          value={maxScore}
          onChange={(e) => setMaxScore(Number(e.target.value) || 5)}
        />
      </div>
      <div className="mt-3">
        <Button
          variant="outline"
          tone="teal"
          disabled={!name}
          onClick={async () => {
            await save.mutateAsync({
              round_id: roundId,
              name,
              description,
              weight,
              max_score: maxScore,
              sort_order: criteria.length,
            });
            setName("");
            setDescription("");
          }}
        >
          <Plus className="h-4 w-4" /> Add criterion
        </Button>
      </div>
    </div>
  );
}

function RubricTab({ event }: { event: EventRow }) {
  const { data: rounds = [] } = useRounds(event.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-foreground">Rubric overview</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each round has its own criteria — edit them under Rounds.
      </p>
      <div className="mt-5 space-y-5">
        {rounds.map((r) => {
          const list = criteria.filter((c) => c.round_id === r.id);
          const total = list.reduce((sum, c) => sum + c.weight, 0);
          return (
            <div key={r.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">{r.name}</h3>
                <span
                  className="text-xs font-semibold"
                  style={{ color: total === 100 ? "var(--teal)" : "var(--magenta)" }}
                >
                  {total}%
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {list.map((c) => (
                  <li key={c.id}>
                    {c.name} — {c.weight}% (max {c.max_score})
                  </li>
                ))}
                {list.length === 0 && <li className="text-xs">No criteria yet.</li>}
              </ul>
            </div>
          );
        })}
        {rounds.length === 0 && (
          <p className="text-sm text-muted-foreground">Add rounds to define a rubric.</p>
        )}
      </div>
    </Card>
  );
}
