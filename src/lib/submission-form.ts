// Per-hackathon settings: what entrants must submit, and how entries are judged.
// Stored on the event (events.submission_form, events.judging_mode) and read by
// the entry form, the judges' scoring page and AI grading.

/* ----------------------------- submission form ---------------------------- */

/** Who the entry is and what it's called. Each can be added once. */
export type CoreKind =
  | "submitter_name"
  | "submitter_email"
  | "team_member_emails"
  | "team_name"
  | "title"
  | "description";

/** Project details kept in their own submission columns. Each can be added once. */
export type BuiltInKind =
  "category" | "concept_note_url" | "video_url" | "deck_url" | "demo_url" | "repo_url";

/** Organiser-defined questions, saved in submissions.answers under the field's id. */
export type CustomKind = "text" | "long_text" | "link";

export type FieldKind = CoreKind | BuiltInKind | CustomKind;

export type FormField = {
  /** The column name for core and built-in fields; a generated id for custom ones. */
  id: string;
  kind: FieldKind;
  label: string;
  required: boolean;
  /** Short guidance shown under the field. */
  help?: string;
};

/**
 * either: one entry per team or per person, entrants choose.
 * team: one person submits for the whole team.
 * each_member: every team member submits their own form, listing their teammates.
 * individual: individual entries only.
 */
export type Entrants = "either" | "team" | "each_member" | "individual";

export const ENTRANTS: { value: Entrants; label: string }[] = [
  { value: "each_member", label: "Teams: every team member submits their own form" },
  { value: "team", label: "Teams: one person submits for the whole team" },
  { value: "individual", label: "Individuals only" },
  { value: "either", label: "Teams or individuals (entrants choose)" },
];

export type SubmissionForm = {
  entrants: Entrants;
  fields: FormField[];
};

type KindInfo = {
  /** Name in the organiser's "Add a field" list. */
  name: string;
  /** Label a new field starts with; the organiser can rename it. */
  label: string;
  isLink: boolean;
  multiline?: boolean;
  placeholder?: string;
  help?: string;
  /** Only asked of team entries. */
  teamOnly?: boolean;
  /** Can't be removed or made optional. */
  locked?: boolean;
};

export const FIELD_KINDS: Record<FieldKind, KindInfo> = {
  submitter_name: { name: "Name", label: "Full name", isLink: false },
  submitter_email: {
    name: "Email",
    label: "Email",
    isLink: false,
    locked: true,
    placeholder: "you@example.com",
    help: "Each email can only be used for one entry. Only the organisers and judges can see it.",
  },
  team_member_emails: {
    name: "Team members' emails",
    label: "Team members' emails",
    isLink: false,
    teamOnly: true,
    help: "Add everyone else on your team. Only the organisers and judges can see these.",
  },
  team_name: { name: "Team name", label: "Team name", isLink: false, teamOnly: true },
  title: {
    name: "Project name",
    label: "Project name",
    isLink: false,
    placeholder: "e.g. AgriTrack",
  },
  description: {
    name: "Project description",
    label: "Project description",
    isLink: false,
    multiline: true,
    placeholder: "What problem does it solve, who is it for, and what did you build?",
  },
  category: {
    name: "Category / track",
    label: "Category",
    isLink: false,
    placeholder: "e.g. AgriTech",
  },
  concept_note_url: {
    name: "Documentation link",
    label: "Project documentation",
    isLink: true,
    placeholder: "https://docs.google.com/...",
    help: "Set sharing to “Anyone with the link” so judges can open it.",
  },
  video_url: {
    name: "Video link (YouTube or Google Drive)",
    label: "Video demo",
    isLink: true,
    placeholder: "https://youtu.be/... or https://drive.google.com/...",
    help: "On Google Drive, set sharing to “Anyone with the link” so judges can watch it.",
  },
  deck_url: {
    name: "Pitch deck / presentation link (Canva, Google Slides)",
    label: "Pitch deck",
    isLink: true,
    placeholder: "https://canva.com/...",
  },
  demo_url: {
    name: "Live prototype link",
    label: "Live prototype",
    isLink: true,
    placeholder: "https://your-app.lovable.app",
  },
  repo_url: {
    name: "GitHub repository link",
    label: "GitHub repository",
    isLink: true,
    placeholder: "https://github.com/...",
  },
  text: { name: "Short answer (your own question)", label: "", isLink: false },
  long_text: { name: "Long answer (your own question)", label: "", isLink: false, multiline: true },
  link: {
    name: "Other link (your own question)",
    label: "",
    isLink: true,
    placeholder: "https://...",
  },
};

export const CORE_KINDS: CoreKind[] = [
  "submitter_name",
  "submitter_email",
  "team_member_emails",
  "team_name",
  "title",
  "description",
];
export const BUILT_IN_KINDS: BuiltInKind[] = [
  "category",
  "concept_note_url",
  "video_url",
  "deck_url",
  "demo_url",
  "repo_url",
];
export const CUSTOM_KINDS: CustomKind[] = ["text", "long_text", "link"];

export const isCore = (kind: FieldKind): kind is CoreKind =>
  (CORE_KINDS as string[]).includes(kind);
export const isBuiltIn = (kind: FieldKind): kind is BuiltInKind =>
  (BUILT_IN_KINDS as string[]).includes(kind);

/** Does this hackathon take team entries? */
export const allowsTeams = (entrants: Entrants) => entrants !== "individual";

/** The fields that apply: team-only fields are dropped for individuals-only hackathons. */
export const activeFields = (form: SubmissionForm) =>
  form.fields.filter((f) => allowsTeams(form.entrants) || !FIELD_KINDS[f.kind].teamOnly);

const field = (kind: FieldKind, label: string, required = true, help?: string): FormField => ({
  id: kind,
  kind,
  label,
  required,
  ...(help ? { help } : {}),
});

/** The entry details every hackathon asked for before the form could be changed. */
const DEFAULT_CORE: FormField[] = [
  field("title", "Project title"),
  field("team_name", "Team name"),
  field("description", "Project description"),
  field("submitter_name", "Your name"),
  field("submitter_email", "Your email (email used on LMS)"),
  field("team_member_emails", "Your teammates' emails (email used on LMS)"),
];

/** The form hackathons used before it could be changed: entry details, category, four links. */
export const DEFAULT_FORM: SubmissionForm = {
  entrants: "either",
  fields: [
    ...DEFAULT_CORE,
    field("category", "Category", false),
    field("video_url", "Video demo link"),
    field("deck_url", "Pitch deck link"),
    field("demo_url", "Live prototype link"),
    field("repo_url", "GitHub repository link"),
  ],
};

/** The hackathon's form, falling back to the default for hackathons that never set one. */
export function formFor(event: { submission_form?: unknown } | null | undefined): SubmissionForm {
  const raw = event?.submission_form as Partial<SubmissionForm> | null | undefined;
  if (!raw || !Array.isArray(raw.fields)) return DEFAULT_FORM;
  const entrants: Entrants = ENTRANTS.some((e) => e.value === raw.entrants)
    ? (raw.entrants as Entrants)
    : "either";
  let fields = raw.fields.filter(
    (f): f is FormField =>
      !!f && typeof f.id === "string" && typeof f.label === "string" && f.kind in FIELD_KINDS,
  );
  // Forms saved before the entry details could be chosen get the old ones back.
  if (!fields.some((f) => isCore(f.kind))) fields = [...DEFAULT_CORE, ...fields];
  // Email is how an entry is told apart, so every form asks for it.
  if (!fields.some((f) => f.kind === "submitter_email"))
    fields = [field("submitter_email", "Email"), ...fields];
  fields = fields.map((f) => (FIELD_KINDS[f.kind].locked ? { ...f, required: true } : f));
  return { entrants, fields };
}

export function newFieldId() {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

/** The value an entry gave for a project detail or question: a column for built-ins, else its answers. */
export function fieldValue(
  entry: Partial<Record<BuiltInKind, string | null>> & { answers?: unknown },
  field: FormField,
): string {
  if (isCore(field.kind)) return "";
  if (isBuiltIn(field.kind)) return (entry[field.kind] ?? "").trim();
  const answers = (entry.answers ?? {}) as Record<string, unknown>;
  const v = answers[field.id];
  return typeof v === "string" ? v.trim() : "";
}

/* ------------------------------- judging mode ------------------------------ */

export type JudgingMode = "judge_ai" | "judge" | "ai" | "panel" | "panel_ai";

export type ModeInfo = {
  label: string;
  description: string;
  /** Whether AI grading runs and its approved results count. */
  usesAi: boolean;
  /** How many judges the hackathon expects (0 = none). */
  minJudges: number;
  /** At most this many judges; null = no limit. */
  maxJudges: number | null;
};

export const JUDGING_MODES: Record<JudgingMode, ModeInfo> = {
  judge_ai: {
    label: "1 judge + AI grading",
    description:
      "One judge scores every entry, and approved AI results are averaged in as a second judge.",
    usesAi: true,
    minJudges: 1,
    maxJudges: 1,
  },
  judge: {
    label: "1 judge",
    description: "One judge scores every entry. AI grading is off.",
    usesAi: false,
    minJudges: 1,
    maxJudges: 1,
  },
  ai: {
    label: "AI grading only",
    description:
      "No judging panel. AI scores every entry and you approve each result before it counts.",
    usesAi: true,
    minJudges: 0,
    maxJudges: 0,
  },
  panel: {
    label: "2 or more judges",
    description:
      "A panel of judges scores the entries, and their scores are averaged. AI grading is off.",
    usesAi: false,
    minJudges: 2,
    maxJudges: null,
  },
  panel_ai: {
    label: "AI grading + 2 or more judges",
    description:
      "A panel of judges scores the entries, and approved AI results are averaged in as one more judge.",
    usesAi: true,
    minJudges: 2,
    maxJudges: null,
  },
};

export const JUDGING_MODE_ORDER: JudgingMode[] = ["judge_ai", "judge", "ai", "panel", "panel_ai"];

export function judgingModeOf(event: { judging_mode?: string | null } | null | undefined) {
  const m = event?.judging_mode;
  return (m && m in JUDGING_MODES ? m : "panel_ai") as JudgingMode;
}

/** A short note when the invited panel doesn't fit the judging setup; null when it does. */
export function panelSizeWarning(mode: JudgingMode, judgeCount: number) {
  const info = JUDGING_MODES[mode];
  if (info.maxJudges === 0 && judgeCount > 0)
    return `This hackathon is set to AI grading only, so judges' scores are not needed. ${judgeCount} ${judgeCount === 1 ? "judge is" : "judges are"} on the panel; their scores still count.`;
  if (info.maxJudges !== null && info.maxJudges > 0 && judgeCount > info.maxJudges)
    return `This hackathon is set to "${info.label}", but ${judgeCount} judges are on the panel. Every judge's scores count, so remove the extra judges or change the judging setup.`;
  if (judgeCount < info.minJudges)
    return `This hackathon is set to "${info.label}". Invite ${info.minJudges - judgeCount} more ${info.minJudges - judgeCount === 1 ? "judge" : "judges"}.`;
  return null;
}
