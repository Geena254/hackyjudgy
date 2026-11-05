// Hackathon setup tabs: what entrants submit, and how entries are judged.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Bot, Lock, Plus, Scale, Trash2, User, Users } from "lucide-react";
import { Card, Button } from "@/components/app-shell";
import { useJudges, useSaveEvent, type EventRow } from "@/lib/hackathon";
import {
  BUILT_IN_KINDS,
  CORE_KINDS,
  CUSTOM_KINDS,
  ENTRANTS,
  FIELD_KINDS,
  JUDGING_MODES,
  JUDGING_MODE_ORDER,
  allowsTeams,
  formFor,
  isBuiltIn,
  isCore,
  judgingModeOf,
  newFieldId,
  panelSizeWarning,
  type Entrants,
  type FieldKind,
  type FormField,
  type JudgingMode,
  type SubmissionForm,
} from "@/lib/submission-form";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[color:var(--teal)]";

function SaveRow({
  dirty,
  pending,
  notice,
  error,
  onSave,
  onReset,
}: {
  dirty: boolean;
  pending: boolean;
  notice: string | null;
  error: string | null;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Button variant="primary" tone="teal" disabled={!dirty || pending} onClick={onSave}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
      {dirty && (
        <Button variant="ghost" tone="magenta" onClick={onReset}>
          Discard changes
        </Button>
      )}
      {error && (
        <span className="text-sm" style={{ color: "var(--magenta)" }}>
          {error}
        </span>
      )}
      {!error && notice && !dirty && (
        <span className="text-sm" style={{ color: "var(--teal)" }}>
          {notice}
        </span>
      )}
    </div>
  );
}

/* ----------------------------- submission form ---------------------------- */

const ENTRANTS_HELP: Record<Entrants, string> = {
  each_member:
    "Every learner fills in the form for themselves and lists their teammates. Each person's submission is judged on its own, and each email can submit once.",
  team: "One person submits for the whole team and lists their teammates. Each person can only be on one entry.",
  individual: "Everyone enters on their own. Team fields are left off the form.",
  either: "Entrants choose to enter as a team (one person submits for it) or on their own.",
};

export function SubmissionFormTab({ event }: { event: EventRow }) {
  const save = useSaveEvent();
  const saved = formFor(event);
  const [form, setForm] = useState<SubmissionForm>(saved);
  const [adding, setAdding] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savedJson = JSON.stringify(saved);
  useEffect(() => {
    setForm(JSON.parse(savedJson) as SubmissionForm);
    setError(null);
  }, [event.id, savedJson]);

  const dirty = JSON.stringify(form) !== savedJson;
  const used = new Set(form.fields.map((f) => f.kind));
  const teams = allowsTeams(form.entrants);
  const groups: { label: string; kinds: FieldKind[] }[] = [
    {
      label: "Entrant and team details",
      kinds: CORE_KINDS.filter((k) => !used.has(k) && (teams || !FIELD_KINDS[k].teamOnly)),
    },
    { label: "Project links and details", kinds: BUILT_IN_KINDS.filter((k) => !used.has(k)) },
    { label: "Your own question", kinds: CUSTOM_KINDS },
  ];

  const update = (i: number, patch: Partial<FormField>) =>
    setForm((f) => ({ ...f, fields: f.fields.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const move = (i: number, by: -1 | 1) =>
    setForm((f) => {
      const fields = [...f.fields];
      const j = i + by;
      if (j < 0 || j >= fields.length) return f;
      [fields[i], fields[j]] = [fields[j]!, fields[i]!];
      return { ...f, fields };
    });

  function add(kind: FieldKind) {
    const info = FIELD_KINDS[kind];
    setForm((f) => ({
      ...f,
      fields: [
        ...f.fields,
        {
          id: isCore(kind) || isBuiltIn(kind) ? kind : newFieldId(),
          kind,
          label: info.label,
          required: true,
        },
      ],
    }));
    setAdding("");
  }

  async function onSave() {
    setError(null);
    const blank = form.fields.find((f) => !f.label.trim());
    if (
      !form.fields.some(
        (f) => f.kind === "title" || f.kind === "team_name" || f.kind === "submitter_name",
      )
    ) {
      setError("Add a project name, team name or name, so each entry can be told apart.");
      return;
    }
    if (blank) {
      setError("Give every field a name before saving.");
      return;
    }
    const clean: SubmissionForm = {
      entrants: form.entrants,
      fields: form.fields.map((f) => ({
        ...f,
        label: f.label.trim(),
        ...(f.help?.trim() ? { help: f.help.trim() } : { help: undefined }),
      })),
    };
    try {
      await save.mutateAsync({ ...event, submission_form: clean });
      setNotice("Saved. The entry form now asks for these fields.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the form.");
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-foreground">Submission form</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose what entrants submit for {event.name}. Judges and AI grading see each entry&apos;s
        answers under the names you give the fields here.
      </p>

      <label className="mt-5 block sm:max-w-md">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Who submits</span>
        <select
          value={form.entrants}
          onChange={(e) => setForm({ ...form, entrants: e.target.value as Entrants })}
          className={inputClass}
        >
          {ENTRANTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">
          {ENTRANTS_HELP[form.entrants]}
        </span>
      </label>

      <h3 className="mt-6 text-sm font-bold text-foreground">Fields on the form</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        In the order entrants see them. Rename any field, and add or remove fields from the list
        below.
      </p>
      <ul className="mt-3 space-y-3">
        {form.fields.map((f, i) => {
          const info = FIELD_KINDS[f.kind];
          const skipped = !teams && info.teamOnly;
          return (
            <li
              key={f.id}
              className="rounded-md border border-border p-3"
              style={skipped ? { opacity: 0.55 } : undefined}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={f.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    placeholder="Name of the field, e.g. Team roles"
                    aria-label="Field name"
                    className={`${inputClass} font-medium`}
                  />
                  <input
                    value={f.help ?? ""}
                    onChange={(e) => update(i, { help: e.target.value })}
                    placeholder="Guidance for entrants (optional)"
                    aria-label={`Guidance for ${f.label || "this field"}`}
                    className={`${inputClass} text-xs`}
                  />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {info.locked && <Lock className="h-3 w-3" strokeWidth={2} />}
                    {info.name}
                    {info.locked && " - always required, so each person submits only once"}
                    {skipped && " - not asked, since this hackathon is for individuals"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <label className="mr-2 flex items-center gap-1.5 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={f.required || !!info.locked}
                      disabled={info.locked}
                      onChange={(e) => update(i, { required: e.target.checked })}
                      className="h-4 w-4 accent-[color:var(--teal)]"
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${f.label || "field"} up`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === form.fields.length - 1}
                    aria-label={`Move ${f.label || "field"} down`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={info.locked}
                    onClick={() =>
                      setForm((x) => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }))
                    }
                    aria-label={`Remove ${f.label || "field"}`}
                    className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30"
                    style={{ color: "var(--magenta)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block w-full sm:w-96">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Add a field</span>
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className={inputClass}>
            <option value="">Choose what entrants should submit…</option>
            {groups
              .filter((g) => g.kinds.length > 0)
              .map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.kinds.map((k) => (
                    <option key={k} value={k}>
                      {FIELD_KINDS[k].name}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </label>
        <Button
          variant="outline"
          tone="teal"
          disabled={!adding}
          onClick={() => add(adding as FieldKind)}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        AI grading reads GitHub repositories and pitch decks (Canva or Google Slides) for itself.
        Other links are shown to judges to open.
      </p>

      <SaveRow
        dirty={dirty}
        pending={save.isPending}
        notice={notice}
        error={error}
        onSave={onSave}
        onReset={() => setForm(JSON.parse(savedJson) as SubmissionForm)}
      />
    </Card>
  );
}

/* --------------------------------- judging --------------------------------- */

/** The hackathon's judging setup on the Judges page, with a warning if the panel doesn't fit it. */
export function JudgingSetupNotice({ event }: { event: EventRow }) {
  const { data: judges = [], isSuccess } = useJudges(event.id);
  const mode = judgingModeOf(event);
  const warning = isSuccess ? panelSizeWarning(mode, judges.length) : null;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-foreground">
          <span className="font-semibold">Judging setup:</span> {JUDGING_MODES[mode].label}
        </div>
        <Link to="/events" className="text-sm font-semibold" style={{ color: "var(--teal)" }}>
          Change in Hackathon setup
        </Link>
      </div>
      {warning && (
        <p className="mt-1 text-xs" style={{ color: "var(--magenta)" }}>
          {warning}
        </p>
      )}
    </Card>
  );
}

const MODE_ICONS: Record<JudgingMode, React.ComponentType<{ className?: string }>[]> = {
  judge_ai: [User, Bot],
  judge: [User],
  ai: [Bot],
  panel: [Users],
  panel_ai: [Users, Bot],
};

export function JudgingTab({ event }: { event: EventRow }) {
  const save = useSaveEvent();
  const { data: judges = [] } = useJudges(event.id);
  const savedMode = judgingModeOf(event);
  const [mode, setMode] = useState<JudgingMode>(savedMode);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMode(savedMode), [event.id, savedMode]);

  const warning = panelSizeWarning(mode, judges.length);
  const info = JUDGING_MODES[mode];

  async function onSave() {
    setError(null);
    try {
      await save.mutateAsync({ ...event, judging_mode: mode });
      setNotice("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the judging setup.");
    }
  }

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Scale className="h-5 w-5" style={{ color: "var(--teal)" }} /> Judging
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how entries in {event.name} are judged. Smaller hackathons may only need one judge,
        or AI grading on its own.
      </p>

      <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Judging setup</legend>
        {JUDGING_MODE_ORDER.map((m) => {
          const selected = mode === m;
          const Icons = MODE_ICONS[m];
          return (
            <label
              key={m}
              className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-4"
              style={{
                borderColor: selected ? "var(--teal)" : "var(--border)",
                boxShadow: selected ? "inset 0 0 0 1px var(--teal)" : undefined,
              }}
            >
              <input
                type="radio"
                name="judging-mode"
                value={m}
                checked={selected}
                onChange={() => setMode(m)}
                className="sr-only"
              />
              <span
                className="mt-0.5 flex shrink-0 gap-0.5"
                style={{ color: selected ? "var(--teal)" : "var(--muted-foreground)" }}
              >
                {Icons.map((I, k) => (
                  <I key={k} className="h-5 w-5" />
                ))}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {JUDGING_MODES[m].label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {JUDGING_MODES[m].description}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-5 rounded-md border border-border p-4 text-sm">
        <div className="text-foreground">
          <span className="font-semibold">Judging panel:</span> {judges.length}{" "}
          {judges.length === 1 ? "judge" : "judges"} invited.{" "}
          {info.minJudges > 0 && (
            <Link to="/judges" className="font-semibold" style={{ color: "var(--teal)" }}>
              Manage judges
            </Link>
          )}
        </div>
        {warning && (
          <p className="mt-1 text-xs" style={{ color: "var(--magenta)" }}>
            {warning}
          </p>
        )}
        {info.usesAi && (
          <p className="mt-1 text-xs text-muted-foreground">
            Run AI grading from the{" "}
            <Link to="/ai-grading" className="font-semibold" style={{ color: "var(--teal)" }}>
              AI grading
            </Link>{" "}
            page. Each AI result counts only after you approve it.
          </p>
        )}
      </div>

      <SaveRow
        dirty={mode !== savedMode}
        pending={save.isPending}
        notice={notice}
        error={error}
        onSave={onSave}
        onReset={() => setMode(savedMode)}
      />
    </Card>
  );
}
