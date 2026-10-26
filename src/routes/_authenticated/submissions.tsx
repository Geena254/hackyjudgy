import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useSelectedEvent } from "@/hooks/use-selected-event";
import { EntryForm } from "@/components/entry-form";
import {
  useEvents,
  useRounds,
  useSubmissions,
  useDeleteSubmission,
  STATUS_LABELS,
  formatDate,
  type SubmissionRow,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/submissions")({
  // `q` arrives from the workspace search bar.
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s.q === "string" && s.q ? { q: s.q } : {},
  head: () => ({
    meta: [
      { title: "Entries - GavelLab" },
      {
        name: "description",
        content: "Add, edit and track every project entered into your hackathon.",
      },
      { property: "og:title", content: "Entries - GavelLab" },
      { property: "og:description", content: "Manage the projects your judges will score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmissionsAdmin,
});


function SubmissionsAdmin() {
  const { isAdmin, ready } = useAuth();
  const { data: events = [] } = useEvents();
  const [event] = useSelectedEvent(events);
  const eventId = event?.id;

  const { data: rounds = [] } = useRounds(eventId);
  const { data: subs = [] } = useSubmissions(eventId);
  const remove = useDeleteSubmission();

  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  useEffect(() => setQuery(q ?? ""), [q]);
  const [editing, setEditing] = useState<SubmissionRow | null>(null);
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
    setOpen(true);
  }

  function startEdit(s: SubmissionRow) {
    setEditing(s);
    setOpen(true);
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
          {events.length === 0 && (
            <span className="text-sm text-muted-foreground">No hackathons yet</span>
          )}
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
          {event && (
            // Adding and editing both use the participant form: team or solo, teammates, LMS emails.
            <EntryForm
              key={editing?.id ?? "new"}
              event={event}
              rounds={rounds}
              entry={editing ?? undefined}
              onDone={() => setOpen(false)}
              linksRequired={false}
            />
          )}
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
                  {s.team_name ?? s.submitter_name ?? " - "}
                  {(s.team_member_emails ?? []).length > 0
                    ? ` · team of ${s.team_member_emails.length + 1}`
                    : s.team_name
                      ? ""
                      : " · solo"}
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
