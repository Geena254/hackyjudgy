import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  FileText,
  Github,
  Lock,
  Search,
  Unlock,
} from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSubmissions,
  useMyScores,
  useMyReviews,
  useSaveScore,
  useSaveReview,
  criteriaForSubmission,
  weightedPercent,
  scoreMap,
  formatDate,
  type CriterionRow,
  type SubmissionRow,
} from "@/lib/hackathon";

export const Route = createFileRoute("/_authenticated/scoring")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Scoring Queue — GavelLab" },
      {
        name: "description",
        content: "Score submissions against the rubric with autosaved feedback and Save & Next.",
      },
      { property: "og:title", content: "Scoring Queue — GavelLab" },
      { property: "og:description", content: "Work through your judging queue submission by submission." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScoringQueue,
});

function ScoringQueue() {
  const { id: initialId } = Route.useSearch();
  const { user } = useAuth();
  const { data: events = [] } = useEvents();
  const event = events.find((e) => e.status === "active") ?? events[0];
  const { data: rounds = [] } = useRounds(event?.id);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: subs = [] } = useSubmissions(event?.id);
  const { data: myScores = [] } = useMyScores(user?.id);
  const { data: myReviews = [] } = useMyReviews(user?.id);
  const saveScore = useSaveScore(user?.id);
  const saveReview = useSaveReview(user?.id);

  const [category, setCategory] = useState("All categories");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(initialId);
  const [blind, setBlind] = useState(true);

  const categories = useMemo(
    () => [
      "All categories",
      ...Array.from(new Set(subs.map((s) => s.category).filter((c): c is string => !!c))),
    ],
    [subs],
  );

  const filtered = useMemo(
    () =>
      subs.filter((s) => {
        if (category !== "All categories" && s.category !== category) return false;
        if (query && !s.title.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [subs, category, query],
  );

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selectedId || !filtered.some((s) => s.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected = subs.find((s) => s.id === selectedId);
  const idx = filtered.findIndex((s) => s.id === selectedId);
  const crit = criteriaForSubmission(selected, rounds, criteria);
  const values = selected ? scoreMap(myScores, selected.id, user?.id) : {};
  const review = myReviews.find((r) => r.submission_id === selectedId);

  function next() {
    if (filtered.length === 0) return;
    const ni = (idx + 1) % filtered.length;
    setSelectedId(filtered[ni]!.id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveAndNext() {
    if (selected) {
      const complete = crit.length > 0 && crit.every((c) => values[c.id] !== undefined);
      await saveReview.mutateAsync({ submissionId: selected.id, completed: complete });
    }
    next();
  }

  return (
    <AppShell>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Judging{event ? ` · ${event.name}` : ""}
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Scoring queue</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,30%)_minmax(0,1fr)]">
        <Card className="flex h-fit flex-col p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Submissions <span className="text-muted-foreground">({filtered.length})</span>
          </h2>
          <div className="relative mb-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm outline-none focus:border-[color:var(--teal)]"
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search submissions..."
              className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--teal)]"
            />
          </div>
          <ul className="-mx-2 overflow-y-auto pr-1">
            {filtered.map((s) => {
              const sCrit = criteriaForSubmission(s, rounds, criteria);
              const sVals = scoreMap(myScores, s.id, user?.id);
              const done = sCrit.length > 0 && sCrit.every((c) => sVals[c.id] !== undefined);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className="block w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-muted"
                    style={
                      s.id === selectedId
                        ? { background: "var(--teal-soft)", borderLeft: "3px solid var(--teal)" }
                        : { borderLeft: "3px solid transparent" }
                    }
                  >
                    <div className="truncate text-sm font-semibold text-foreground">{s.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {blind
                        ? `Submission #${s.id.slice(0, 6).toUpperCase()}`
                        : (s.team_name ?? s.submitter_name ?? "Unnamed team")}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {s.category && <Pill tone="gray">{s.category}</Pill>}
                      <Pill tone={done ? "teal" : "magenta"}>{done ? "Scored" : "Pending"}</Pill>
                    </div>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No submissions match your filters.
              </li>
            )}
          </ul>
        </Card>

        <div className="min-w-0 space-y-6">
          {!selected && (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Nothing to score yet.
            </Card>
          )}
          {selected && (
            <>
              <Card className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold" style={{ color: "var(--teal)" }}>
                      {selected.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {selected.category && <Pill tone="gray">{selected.category}</Pill>}
                      <span className="text-xs text-muted-foreground">
                        Submitted {formatDate(selected.created_at.slice(0, 10))}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setBlind((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    style={{ color: "var(--magenta)" }}
                    aria-pressed={blind}
                  >
                    {blind ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    Blind judging: {blind ? "ON" : "OFF"}
                  </button>
                </div>

                {selected.description && (
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {selected.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  {selected.repo_url && (
                    <LinkOut href={selected.repo_url} icon={Github} label="Repository" />
                  )}
                  {selected.demo_url && (
                    <LinkOut href={selected.demo_url} icon={ExternalLink} label="Demo" />
                  )}
                  {selected.deck_url && (
                    <LinkOut href={selected.deck_url} icon={FileText} label="Pitch deck" />
                  )}
                </div>

                {!blind && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    Team: <span className="text-foreground">{selected.team_name ?? "—"}</span> ·
                    Submitted by{" "}
                    <span className="text-foreground">{selected.submitter_name ?? "—"}</span>
                  </div>
                )}
              </Card>

              <Rubric
                key={selected.id}
                submission={selected}
                criteria={crit}
                values={values}
                onScore={(criterionId, value) =>
                  saveScore.mutate({ submissionId: selected.id, criterionId, value })
                }
                feedback={review?.feedback ?? ""}
                privateNotes={review?.private_notes ?? ""}
                onSaveText={(payload) =>
                  saveReview.mutate({ submissionId: selected.id, ...payload })
                }
                onNext={saveAndNext}
                position={`Submission ${idx + 1} of ${filtered.length}`}
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function LinkOut({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
      style={{ color: "var(--teal)" }}
    >
      <Icon className="h-4 w-4" strokeWidth={2} /> {label}
    </a>
  );
}

function Rubric({
  submission,
  criteria,
  values,
  onScore,
  feedback,
  privateNotes,
  onSaveText,
  onNext,
  position,
}: {
  submission: SubmissionRow;
  criteria: CriterionRow[];
  values: Record<string, number>;
  onScore: (criterionId: string, value: number) => void;
  feedback: string;
  privateNotes: string;
  onSaveText: (payload: { feedback?: string; privateNotes?: string }) => void;
  onNext: () => void;
  position: string;
}) {
  const [fb, setFb] = useState(feedback);
  const [notes, setNotes] = useState(privateNotes);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function autosave(patch: { feedback?: string; privateNotes?: string }) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSaveText(patch);
      setSaved(true);
    }, 700);
  }

  const scored = criteria.filter((c) => values[c.id] !== undefined);
  const percent = weightedPercent(criteria, values);
  const complete = criteria.length > 0 && scored.length === criteria.length;

  if (criteria.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No rubric criteria have been configured for this round yet.
      </Card>
    );
  }

  return (
    <Card className="p-6" key={submission.id}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold" style={{ color: "var(--teal)" }}>
            Rubric
          </h3>
          <p className="text-sm text-muted-foreground">
            Score each criterion — weights are applied automatically.
          </p>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Weighted score
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: complete ? "var(--teal)" : "var(--foreground)" }}
          >
            {percent === null ? "—" : `${percent}%`}
          </div>
          <div
            className="text-[10px] uppercase tracking-wider"
            style={{ color: complete ? "var(--teal)" : "var(--magenta)" }}
          >
            {scored.length}/{criteria.length} scored
          </div>
        </div>
      </div>

      <ul className="space-y-4">
        {criteria.map((c) => {
          const v = values[c.id];
          const max = c.max_score || 5;
          return (
            <li key={c.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">
                    {c.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · weight {c.weight}
                    </span>
                  </div>
                  {c.description && (
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{v ?? "—"}</strong>/{max}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
                  const active = v === n;
                  return (
                    <label
                      key={n}
                      className="grid h-10 w-10 cursor-pointer place-items-center rounded-md border text-sm font-semibold transition-colors"
                      style={
                        active
                          ? { background: "var(--teal)", borderColor: "var(--teal)", color: "#fff" }
                          : { borderColor: "var(--border)", color: "var(--foreground)" }
                      }
                    >
                      <input
                        type="radio"
                        name={`${submission.id}-${c.id}`}
                        checked={active}
                        onChange={() => onScore(c.id, n)}
                        className="sr-only"
                      />
                      {n}
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">
            Feedback (visible to the team)
          </label>
          {saved && (
            <span className="text-xs" style={{ color: "var(--teal)" }}>
              Auto-saved
            </span>
          )}
        </div>
        <textarea
          value={fb}
          onChange={(e) => {
            setFb(e.target.value);
            setSaved(false);
            autosave({ feedback: e.target.value });
          }}
          rows={4}
          placeholder="What worked well? What could be stronger?"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
        />
        <label className="mt-4 block text-sm font-medium text-foreground">
          Private notes (never shared with the team)
        </label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
            autosave({ privateNotes: e.target.value });
          }}
          rows={3}
          placeholder="Notes for the organising team only."
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--magenta)]"
        />
      </div>

      <div className="mt-6 space-y-3">
        <Button variant="primary" tone="teal" className="w-full" onClick={onNext}>
          Save &amp; Next <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Button>
        <div className="text-center text-xs text-muted-foreground">{position}</div>
      </div>
    </Card>
  );
}
