import { useState } from "react";
import { Lock, Plus, User, Users, X } from "lucide-react";
import { Button } from "@/components/app-shell";
import {
  useSaveSubmission,
  useSubmitProject,
  formatDateTime,
  STATUS_LABELS,
  type EventRow,
  type RoundRow,
  type SubmissionRow,
  type SubmissionStatus,
} from "@/lib/hackathon";

const STATUSES: SubmissionStatus[] = [
  "submitted",
  "under_review",
  "scored",
  "ranked",
  "disqualified",
];

function Field({
  label,
  note,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Shown in italics beside the label. */
  note?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {note && <em className="ml-1.5 font-normal text-muted-foreground">({note})</em>}
      </span>
      <input
        {...rest}
        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Video demos are hosted on YouTube or Google Drive. */
function isAllowedVideoLink(url: string) {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\.|^m\./, "");
    return ["youtube.com", "youtu.be", "drive.google.com", "docs.google.com"].includes(host);
  } catch {
    return false;
  }
}

/** Shown to participants in place of the entry form once the submission period is over. */
export function SubmissionsClosedNotice({ event }: { event: EventRow }) {
  return (
    <div>
      <div
        className="grid h-10 w-10 place-items-center rounded-md"
        style={{ background: "var(--magenta-soft)", color: "var(--magenta)" }}
      >
        <Lock className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-xl font-bold text-foreground">Submission round closed</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        The submission period for {event.name} ended on{" "}
        <strong className="text-foreground">{formatDateTime(event.submissions_close_at)}</strong>,
        so new entries are no longer accepted. Projects already submitted are now with the judging
        panel.
      </p>
    </div>
  );
}

// Teammates besides the team lead (the database allows up to 20).
const MAX_TEAMMATES = 9;

const EMPTY = {
  title: "",
  team_name: "",
  category: "",
  description: "",
  submitter_name: "",
  submitter_email: "",
  video_url: "",
  deck_url: "",
  demo_url: "",
  repo_url: "",
};

function fromEntry(entry: SubmissionRow) {
  return {
    title: entry.title,
    team_name: entry.team_name ?? "",
    category: entry.category ?? "",
    description: entry.description ?? "",
    submitter_name: entry.submitter_name ?? "",
    submitter_email: entry.submitter_email ?? "",
    video_url: entry.video_url ?? "",
    deck_url: entry.deck_url ?? "",
    demo_url: entry.demo_url ?? "",
    repo_url: entry.repo_url ?? "",
  };
}

/**
 * Hackathon entry form, used by participants and by organisers. Entrants choose
 * to enter as a team or on their own. Given an `entry`, organisers edit it and
 * also get its round, status and concept note link.
 */
export function EntryForm({
  event,
  rounds,
  onDone,
  linksRequired = true,
  entry,
}: {
  event: EventRow;
  rounds: RoundRow[];
  onDone: (submissionId: string) => void;
  /** Participants must give all four links; organisers adding an entry may leave them out. */
  linksRequired?: boolean;
  /** An existing entry for an organiser to edit. */
  entry?: SubmissionRow;
}) {
  const submit = useSubmitProject();
  const save = useSaveSubmission();
  // Organisers (adding or editing) may leave contact details and teammates incomplete.
  const organiser = !linksRequired || !!entry;
  const [entryAs, setEntryAs] = useState<"team" | "individual" | null>(
    entry ? (entry.team_name || entry.team_member_emails?.length ? "team" : "individual") : null,
  );
  const [form, setForm] = useState(entry ? fromEntry(entry) : EMPTY);
  const [teammates, setTeammates] = useState<string[]>(
    entry?.team_member_emails?.length ? entry.team_member_emails : [""],
  );
  const [extras, setExtras] = useState({
    round_id: entry?.round_id ?? "",
    status: entry?.status ?? ("submitted" as SubmissionStatus),
    concept_note_url: entry?.concept_note_url ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const pending = submit.isPending || save.isPending;

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const setTeammate = (i: number, value: string) =>
    setTeammates((prev) => prev.map((t, j) => (j === i ? value : t)));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!entryAs) {
      setError("Choose whether you're entering as a team or on your own.");
      return;
    }
    const lead = form.submitter_email.trim().toLowerCase();
    const emails = teammates.map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (!organiser && form.video_url.trim() && !isAllowedVideoLink(form.video_url)) {
      setError("The video demo link should be a YouTube or Google Drive link.");
      return;
    }
    if (entryAs === "team") {
      if (emails.length === 0 && !organiser) {
        setError("Add at least one teammate's email, or choose “Just me”.");
        return;
      }
      if (lead && emails.includes(lead)) {
        setError("Your own email is already the team lead's - list only your teammates.");
        return;
      }
      if (new Set(emails).size !== emails.length) {
        setError("Each teammate's email should appear only once.");
        return;
      }
    }
    const submissionRound = rounds.find((r) => r.phase === "submissions") ?? rounds[0];
    try {
      if (entry) {
        await save.mutateAsync({
          id: entry.id,
          event_id: event.id,
          ...form,
          team_name: entryAs === "team" ? form.team_name : "",
          team_member_emails: entryAs === "team" ? emails : [],
          round_id: extras.round_id,
          status: extras.status,
          concept_note_url: extras.concept_note_url,
        });
        onDone(entry.id);
        return;
      }
      const id = await submit.mutateAsync({
        event_id: event.id,
        round_id: submissionRound?.id ?? null,
        ...form,
        // Solo entrants have no team; standings show them as an independent entry.
        team_name: entryAs === "team" ? form.team_name : "",
        team_member_emails: entryAs === "team" ? emails : [],
      });
      setForm(EMPTY);
      setTeammates([""]);
      setEntryAs(null);
      onDone(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-foreground">Entering as</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: "team", label: "A team", hint: "You're entering with others", icon: Users },
              {
                value: "individual",
                label: "Just me",
                hint: "You're entering on your own",
                icon: User,
              },
            ] as const
          ).map((o) => {
            const selected = entryAs === o.value;
            return (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3"
                style={{
                  borderColor: selected ? "var(--teal)" : "var(--border)",
                  boxShadow: selected ? "inset 0 0 0 1px var(--teal)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="entry-as"
                  value={o.value}
                  checked={selected}
                  onChange={() => setEntryAs(o.value)}
                  required
                  className="sr-only"
                />
                <o.icon
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: selected ? "var(--teal)" : undefined }}
                  strokeWidth={2}
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Project title"
        required
        value={form.title}
        onChange={set("title")}
        placeholder="e.g. AgriTrack"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {entryAs === "team" && (
          <Field label="Team name" required value={form.team_name} onChange={set("team_name")} />
        )}
        <Field
          label="Category"
          value={form.category}
          onChange={set("category")}
          placeholder="e.g. AgriTech"
        />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Project description
        </span>
        <textarea
          required={!entry}
          rows={5}
          value={form.description}
          onChange={set("description")}
          placeholder="What problem does it solve, who is it for, and what did you build?"
          className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={entryAs === "team" ? "Team lead's name" : "Your name"}
          required={!entry}
          value={form.submitter_name}
          onChange={set("submitter_name")}
        />
        <Field
          label={entryAs === "team" ? "Team lead's email" : "Your email"}
          note="Email used on LMS"
          type="email"
          required={!entry}
          value={form.submitter_email}
          onChange={set("submitter_email")}
          hint="Each email can only be used for one entry. Only the organisers and judges can see it."
        />
      </div>

      {entryAs === "team" && (
        <fieldset className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">
            Your teammates&apos; emails
            <em className="ml-1.5 font-normal text-muted-foreground">(Email used on LMS)</em>
          </legend>
          <p className="text-xs text-muted-foreground">
            Add everyone else on your team. Someone already on another entry can&apos;t be added.
            Only the organisers and judges can see these.
          </p>
          <div className="mt-3 space-y-2">
            {teammates.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="email"
                  required={i === 0 && !organiser}
                  value={t}
                  onChange={(e) => setTeammate(i, e.target.value)}
                  placeholder={`teammate${i + 1}@example.com`}
                  aria-label={`Teammate ${i + 1} email`}
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
                />
                {teammates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTeammates((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove teammate ${i + 1}`}
                    className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {teammates.length < MAX_TEAMMATES && (
            <button
              type="button"
              onClick={() => setTeammates((prev) => [...prev, ""])}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: "var(--teal)" }}
            >
              <Plus className="h-4 w-4" strokeWidth={2} /> Add teammate
            </button>
          )}
        </fieldset>
      )}

      <div>
        <h3 className="text-sm font-semibold text-foreground">Project links</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {linksRequired
            ? "All four links are required. Make sure each one is public or shared so judges can open it."
            : "Optional. Add any links the team has shared; you can fill in the rest later by editing the entry."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Video demo link"
          note="YouTube or Google Drive"
          type="url"
          required={linksRequired}
          value={form.video_url}
          onChange={set("video_url")}
          placeholder="https://youtu.be/... or https://drive.google.com/..."
          hint="On Google Drive, set sharing to “Anyone with the link” so judges can watch it."
        />
        <Field
          label="Pitch deck link"
          type="url"
          required={linksRequired}
          value={form.deck_url}
          onChange={set("deck_url")}
          placeholder="https://canva.com/..."
        />
        <Field
          label="Live prototype link"
          type="url"
          required={linksRequired}
          value={form.demo_url}
          onChange={set("demo_url")}
          placeholder="https://your-app.lovable.app"
        />
        <Field
          label="GitHub repository link"
          type="url"
          required={linksRequired}
          value={form.repo_url}
          onChange={set("repo_url")}
          placeholder="https://github.com/..."
        />
      </div>

      {entry && (
        <div className="rounded-md border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Organiser settings</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Round</span>
              <select
                value={extras.round_id}
                onChange={(e) => setExtras({ ...extras, round_id: e.target.value })}
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
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Status</span>
              <select
                value={extras.status}
                onChange={(e) =>
                  setExtras({ ...extras, status: e.target.value as SubmissionStatus })
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
            <div className="sm:col-span-2">
              <Field
                label="Concept note link"
                type="url"
                value={extras.concept_note_url}
                onChange={(e) => setExtras({ ...extras, concept_note_url: e.target.value })}
                placeholder="https://docs.google.com/..."
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--magenta)" }}>
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" tone="teal" disabled={pending}>
        {pending ? (entry ? "Saving…" : "Sending…") : entry ? "Save entry" : "Submit project"}
      </Button>
    </form>
  );
}
