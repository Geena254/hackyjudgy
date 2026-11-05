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
import {
  FIELD_KINDS,
  formFor,
  isBuiltIn,
  activeFields,
  isCore,
  type FieldKind,
  type FormField,
} from "@/lib/submission-form";

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

// Teammates besides the person submitting (the database allows up to 20).
const MAX_TEAMMATES = 19;

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
  concept_note_url: "",
};

type TextKey = keyof typeof EMPTY;

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
    concept_note_url: entry.concept_note_url ?? "",
  };
}

/**
 * Hackathon entry form, used by participants and by organisers. It asks for the
 * fields the organiser chose for this hackathon, in their order. Given an `entry`,
 * organisers edit it and also get its round, status and concept note link.
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
  /** Participants must fill the hackathon's required fields; organisers adding an entry may leave them out. */
  linksRequired?: boolean;
  /** An existing entry for an organiser to edit. */
  entry?: SubmissionRow;
}) {
  const submit = useSubmitProject();
  const save = useSaveSubmission();
  // Organisers (adding or editing) may leave fields empty.
  const organiser = !linksRequired || !!entry;
  const config = formFor(event);
  const fields = activeFields(config);
  const has = (kind: FieldKind) => fields.some((f) => f.kind === kind);
  const hasTeamFields = fields.some((f) => FIELD_KINDS[f.kind].teamOnly);
  // Entrants only choose between a team and a solo entry when the hackathon allows both.
  const askEntryType = config.entrants === "either" && hasTeamFields;
  const fixedEntry: "team" | "individual" | null =
    config.entrants === "individual" || !hasTeamFields
      ? "individual"
      : config.entrants === "either"
        ? null
        : "team";
  const eachMember = config.entrants === "each_member";

  const [entryAs, setEntryAs] = useState<"team" | "individual" | null>(
    entry && askEntryType
      ? entry.team_name || entry.team_member_emails?.length
        ? "team"
        : "individual"
      : fixedEntry,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(entry?.answers ?? {});
  const [form, setForm] = useState(entry ? fromEntry(entry) : EMPTY);
  const [teammates, setTeammates] = useState<string[]>(
    entry?.team_member_emails?.length ? entry.team_member_emails : [""],
  );
  const [extras, setExtras] = useState({
    round_id: entry?.round_id ?? "",
    status: entry?.status ?? ("submitted" as SubmissionStatus),
  });
  const [error, setError] = useState<string | null>(null);
  const pending = submit.isPending || save.isPending;

  const setText = (k: TextKey, v: string) => setForm((prev) => ({ ...prev, [k]: v }));
  const setTeammate = (i: number, value: string) =>
    setTeammates((prev) => prev.map((t, j) => (j === i ? value : t)));

  const team = entryAs === "team";
  const shown = fields.filter((f) => team || !FIELD_KINDS[f.kind].teamOnly);
  const isRequired = (f: FormField) => !organiser && (f.required || !!FIELD_KINDS[f.kind].locked);

  /** "Your name" reads "Team lead's name" when one person submits for a whole team. */
  function labelOf(f: FormField) {
    if (team && !eachMember && f.id === f.kind) {
      if (f.label === "Your name") return "Team lead's name";
      if (f.label.startsWith("Your email"))
        return f.label.replace("Your email", "Team lead's email");
    }
    return f.label;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!entryAs) {
      setError("Choose whether you're entering as a team or on your own.");
      return;
    }
    const lead = form.submitter_email.trim().toLowerCase();
    let emails = teammates.map((t) => t.trim().toLowerCase()).filter(Boolean);
    const video = shown.find((f) => f.kind === "video_url");
    if (!organiser && video && form.video_url.trim() && !isAllowedVideoLink(form.video_url)) {
      setError(`The "${video.label}" link should be a YouTube or Google Drive link.`);
      return;
    }
    if (team && has("team_member_emails")) {
      // Everyone on the team lists the same people, so listing yourself is fine.
      if (eachMember) emails = emails.filter((m) => m !== lead);
      else if (lead && emails.includes(lead)) {
        setError("Your own email is already the team lead's - list only your teammates.");
        return;
      }
      if (new Set(emails).size !== emails.length) {
        setError("Each teammate's email should appear only once.");
        return;
      }
    }
    // Keep only what this hackathon's form asks for.
    const asked = new Set(shown.map((f) => f.kind));
    const values = Object.fromEntries(
      (Object.keys(EMPTY) as TextKey[]).map((k) => [
        k,
        asked.has(k as FieldKind) || k === "concept_note_url" ? form[k] : "",
      ]),
    ) as typeof EMPTY;
    // Every entry needs a name; without a project name, use the team's or the person's.
    values.title =
      values.title.trim() ||
      values.team_name.trim() ||
      values.submitter_name.trim() ||
      values.submitter_email.trim();
    const cleanAnswers = Object.fromEntries(
      shown
        .filter((f) => !isCore(f.kind) && !isBuiltIn(f.kind) && (answers[f.id] ?? "").trim())
        .map((f) => [f.id, answers[f.id]!.trim()]),
    );
    const teamEmails = team && asked.has("team_member_emails") ? emails : [];
    const submissionRound = rounds.find((r) => r.phase === "submissions") ?? rounds[0];
    try {
      if (entry) {
        // Organisers editing keep anything the current form doesn't show.
        await save.mutateAsync({
          id: entry.id,
          event_id: event.id,
          ...form,
          title: values.title,
          team_name: team ? form.team_name : "",
          team_member_emails: team ? emails : [],
          answers: { ...(entry.answers ?? {}), ...cleanAnswers },
          round_id: extras.round_id,
          status: extras.status,
        });
        onDone(entry.id);
        return;
      }
      const id = await submit.mutateAsync({
        event_id: event.id,
        round_id: submissionRound?.id ?? null,
        ...values,
        team_member_emails: teamEmails,
        answers: cleanAnswers,
      });
      setForm(EMPTY);
      setAnswers({});
      setTeammates([""]);
      setEntryAs(fixedEntry);
      onDone(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  function renderField(f: FormField) {
    const required = isRequired(f);
    const info = FIELD_KINDS[f.kind];
    const note = !required && !organiser ? "optional" : undefined;
    const hint = f.help || info.help;

    if (f.kind === "team_member_emails") {
      return (
        <fieldset key={f.id} className="rounded-md border border-border p-4 sm:col-span-2">
          <legend className="px-1 text-sm font-semibold text-foreground">
            {f.label}
            {note && <em className="ml-1.5 font-normal text-muted-foreground">({note})</em>}
          </legend>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <div className="mt-3 space-y-2">
            {teammates.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="email"
                  required={i === 0 && required}
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
      );
    }

    const isText = isCore(f.kind) || isBuiltIn(f.kind);
    const value = isText ? form[f.kind as TextKey] : (answers[f.id] ?? "");
    const onChange = (v: string) =>
      isText ? setText(f.kind as TextKey, v) : setAnswers((prev) => ({ ...prev, [f.id]: v }));
    const label = labelOf(f);
    const videoNote = f.kind === "video_url" ? "YouTube or Google Drive" : undefined;
    const fullNote = [note, videoNote].filter(Boolean).join(", ") || undefined;

    if (info.multiline) {
      return (
        <label key={f.id} className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            {label}
            {fullNote && <em className="ml-1.5 font-normal text-muted-foreground">({fullNote})</em>}
          </span>
          <textarea
            rows={f.kind === "description" ? 5 : 4}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={info.placeholder}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
          />
          {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
        </label>
      );
    }
    return (
      <div key={f.id} className={f.kind === "title" ? "sm:col-span-2" : undefined}>
        <Field
          label={label}
          note={fullNote}
          hint={hint}
          type={f.kind === "submitter_email" ? "email" : info.isLink ? "url" : "text"}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={info.placeholder}
        />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {askEntryType && (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-foreground">Entering as</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "team",
                  label: "A team",
                  hint: "You're entering with others",
                  icon: Users,
                },
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
      )}
      {!entry && !askEntryType && config.entrants !== "either" && (
        <p className="text-sm text-muted-foreground">
          {config.entrants === "each_member"
            ? "Every member of your team fills in this form for themselves."
            : config.entrants === "team"
              ? "This hackathon is for teams. One person submits for the whole team."
              : "This hackathon is for individual entries."}
        </p>
      )}
      {organiser && (
        <p className="text-xs text-muted-foreground">
          Every field is optional for organisers; you can fill in the rest later by editing the
          entry.
        </p>
      )}
      {!organiser && shown.some((f) => FIELD_KINDS[f.kind].isLink) && (
        <p className="text-xs text-muted-foreground">
          Make sure every link is public or shared, so judges can open it.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">{shown.map(renderField)}</div>

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
            {!has("concept_note_url") && (
              <div className="sm:col-span-2">
                <Field
                  label="Concept note link"
                  type="url"
                  value={form.concept_note_url}
                  onChange={(e) => setText("concept_note_url", e.target.value)}
                  placeholder="https://docs.google.com/..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--magenta)" }}>
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" tone="teal" disabled={pending}>
        {pending ? (entry ? "Saving…" : "Sending…") : entry ? "Save entry" : "Submit"}
      </Button>
    </form>
  );
}
