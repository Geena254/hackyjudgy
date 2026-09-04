import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useEvents,
  useRounds,
  useSubmissions,
  useSaveSubmission,
  useDeleteSubmission,
  STATUS_LABELS,
  formatDate,
  type SubmissionRow,
  type SubmissionStatus,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/submissions")({
  head: () => ({
    meta: [
      { title: "Entries — EvalDesk" },
      {
        name: "description",
        content: "Add, edit and track every project entered into your hackathon.",
      },
      { property: "og:title", content: "Entries — EvalDesk" },
      { property: "og:description", content: "Manage the projects your judges will score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmissionsAdmin,
});

const STATUSES: SubmissionStatus[] = [
  "submitted",
  "under_review",
  "scored",
  "ranked",
  "disqualified",
];

const empty = {
  title: "",
  team_name: "",
  category: "",
  description: "",
  submitter_name: "",
  submitter_email: "",
  repo_url: "",
  demo_url: "",
  deck_url: "",
  round_id: "",
  status: "submitted" as SubmissionStatus,
};

function Text({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
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

function SubmissionsAdmin() {
  const { isAdmin, ready } = useAuth();
  const { data: events = [] } = useEvents();
  const [eventId, setEventId] = useState<string | undefined>();
  useEffect(() => {
    if (!eventId && events.length > 0)
      setEventId((events.find((e) => e.status === "active") ?? events[0]!).id);
  }, [events, eventId]);

  const { data: rounds = [] } = useRounds(eventId);
  const { data: subs = [] } = useSubmissions(eventId);
  const save = useSaveSubmission();
  const remove = useDeleteSubmission();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SubmissionRow | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      subs.filter((s) =>
        query ? `${s.title} ${s.team_name ?? ""}`.toLowerCase().includes(query.toLowerCase()) : true,
      ),
    [subs, query],
  );

  function startNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function startEdit(s: SubmissionRow) {
    setEditing(s);
    setForm({
      title: s.title,
      team_name: s.team_name ?? "",
      category: s.category ?? "",
      description: s.description ?? "",
      submitter_name: s.submitter_name ?? "",
      submitter_email: s.submitter_email ?? "",
      repo_url: s.repo_url ?? "",
      demo_url: s.demo_url ?? "",
      deck_url: s.deck_url ?? "",
      round_id: s.round_id ?? "",
      status: s.status,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    await save.mutateAsync({ id: editing?.id, event_id: eventId, ...form });
    setOpen(false);
  }

  if (ready && !isAdmin) {
    return (
      <AppShell>
        <Card className="p-8 text-sm text-muted-foreground">
          Judges score entries from the Scoring Queue.
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
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Entries</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={eventId ?? ""}
            onChange={(e) => setEventId(e.target.value || undefined)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
            {events.length === 0 && <option value="">No hackathons yet</option>}
          </select>
          <Button variant="primary" tone="teal" onClick={startNew} disabled={!eventId}>
            <Plus className="h-4 w-4" /> Add entry
          </Button>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries..."
            className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--teal)]"
          />
        </div>
      </Card>

      {open && (
        <Card className="mb-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {editing ? "Edit entry" : "Add entry"}
            </h2>
            <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1.5 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Text
                label="Project title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Text
                label="Team name"
                value={form.team_name}
                onChange={(e) => setForm({ ...form, team_name: e.target.value })}
              />
              <Text
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Round</span>
                <select
                  value={form.round_id}
                  onChange={(e) => setForm({ ...form, round_id: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">No round</option>
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[color:var(--teal)]"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Text
                label="Submitter name"
                value={form.submitter_name}
                onChange={(e) => setForm({ ...form, submitter_name: e.target.value })}
              />
              <Text
                label="Submitter email"
                type="email"
                value={form.submitter_email}
                onChange={(e) => setForm({ ...form, submitter_email: e.target.value })}
              />
              <Text
                label="Repository link"
                value={form.repo_url}
                onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
              />
              <Text
                label="Demo link"
                value={form.demo_url}
                onChange={(e) => setForm({ ...form, demo_url: e.target.value })}
              />
              <Text
                label="Pitch deck link"
                value={form.deck_url}
                onChange={(e) => setForm({ ...form, deck_url: e.target.value })}
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as SubmissionStatus })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" variant="primary" tone="teal" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Save entry" : "Add entry"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {filtered.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => startEdit(s)}
                  className="truncate text-left text-sm font-semibold text-foreground hover:underline"
                >
                  {s.title}
                </button>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {s.team_name ?? s.submitter_name ?? "—"}
                  {s.category ? ` · ${s.category}` : ""} · {formatDate(s.created_at.slice(0, 10))}
                </div>
              </div>
              <Pill tone={s.status === "submitted" ? "gray" : "teal"}>
                {STATUS_LABELS[s.status]}
              </Pill>
              <button
                onClick={() => {
                  if (confirm(`Delete "${s.title}"?`)) remove.mutate(s.id);
                }}
                aria-label={`Delete ${s.title}`}
                className="rounded-md p-1.5 hover:bg-muted"
                style={{ color: "var(--magenta)" }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-6 py-10 text-center text-sm text-muted-foreground">
              No entries yet. Participants can enter from the public entry page, or add one here.
            </li>
          )}
        </ul>
      </Card>
    </AppShell>
  );
}
