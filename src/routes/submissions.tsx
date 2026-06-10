import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Github,
  Youtube,
  Lock,
  Unlock,
  ChevronDown,
  ArrowRight,
  FileText,
} from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { submissions, categories, rubricCriteria, type Submission } from "@/lib/eval-data";

export const Route = createFileRoute("/submissions")({
  head: () => ({
    meta: [
      { title: "Judge Scoring — EvalDesk" },
      { name: "description", content: "Score submissions against the rubric." },
    ],
  }),
  component: ScoringPage,
});

function ScoringPage() {
  const [category, setCategory] = useState("All Categories");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(submissions[0].id);
  const [blind, setBlind] = useState(true);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [privateNotes, setPrivateNotes] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (category !== "All Categories" && s.category !== category) return false;
      if (query && !s.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [category, query]);

  useEffect(() => {
    if (!filtered.find((s) => s.id === selectedId) && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = submissions.find((s) => s.id === selectedId) ?? submissions[0];
  const idx = filtered.findIndex((s) => s.id === selected.id);

  const setScore = (criterionId: string, val: number) =>
    setScores((prev) => ({
      ...prev,
      [selected.id]: { ...(prev[selected.id] ?? {}), [criterionId]: val },
    }));

  const next = () => {
    const ni = (idx + 1) % filtered.length;
    setSelectedId(filtered[ni].id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Judging
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Score submissions</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,30%)_minmax(0,1fr)]">
        {/* Left panel */}
        <Card className="flex h-fit flex-col p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Submissions <span className="text-muted-foreground">({filtered.length})</span>
            </h2>
          </div>
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
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  className="block w-full rounded-md px-3 py-3 text-left transition-colors hover:bg-muted"
                  style={
                    s.id === selected.id
                      ? {
                          background: "var(--teal-soft)",
                          borderLeft: "3px solid var(--teal)",
                        }
                      : { borderLeft: "3px solid transparent" }
                  }
                >
                  <div className="truncate text-sm font-semibold text-foreground">
                    {s.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {blind ? `Submitter #${s.id.toUpperCase()}` : s.submitter}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Pill tone="teal">{s.category}</Pill>
                    <Pill tone="magenta">{s.status}</Pill>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No submissions match your filters.
              </li>
            )}
          </ul>
        </Card>

        {/* Right panel */}
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "var(--teal)" }}
                >
                  {selected.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Pill tone="teal">{selected.category}</Pill>
                  <Pill tone="magenta">{selected.status}</Pill>
                  {selected.score !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      Current score: <strong className="text-foreground">{selected.score}/5</strong>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setBlind((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                style={{ color: "var(--magenta)" }}
                aria-pressed={blind}
              >
                {blind ? <Lock className="h-3.5 w-3.5" strokeWidth={2} /> : <Unlock className="h-3.5 w-3.5" strokeWidth={2} />}
                Blind Judging: {blind ? "ON" : "OFF"}
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {selected.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {selected.github && (
                <a
                  href={selected.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                  style={{ color: "var(--teal)" }}
                >
                  <Github className="h-4 w-4" strokeWidth={2} /> GitHub
                </a>
              )}
              {selected.youtube && (
                <a
                  href={selected.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                  style={{ color: "var(--magenta)" }}
                >
                  <Youtube className="h-4 w-4" strokeWidth={2} /> YouTube
                </a>
              )}
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" strokeWidth={2} /> Pitch.pdf
              </span>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Submitted: {selected.submittedAt}
              {!blind && <> · by <span className="text-foreground">{selected.submitter}</span></>}
            </div>
          </Card>

          <RubricBlock
            submission={selected}
            scores={scores[selected.id] ?? {}}
            setScore={setScore}
            comment={comments[selected.id] ?? ""}
            setComment={(v) => setComments((prev) => ({ ...prev, [selected.id]: v }))}
            isPrivate={privateNotes[selected.id] ?? false}
            togglePrivate={() =>
              setPrivateNotes((prev) => ({ ...prev, [selected.id]: !prev[selected.id] }))
            }
            onNext={next}
            position={`Submission ${idx + 1} of ${filtered.length}`}
          />
        </div>
      </div>
    </AppShell>
  );
}

function RubricBlock({
  submission,
  scores,
  setScore,
  comment,
  setComment,
  isPrivate,
  togglePrivate,
  onNext,
  position,
}: {
  submission: Submission;
  scores: Record<string, number>;
  setScore: (id: string, v: number) => void;
  comment: string;
  setComment: (v: string) => void;
  isPrivate: boolean;
  togglePrivate: () => void;
  onNext: () => void;
  position: string;
}) {
  const scoreValues = Object.values(scores);
  const filled = scoreValues.filter((v) => typeof v === "number") as number[];
  const avg =
    filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
  const complete = filled.length === rubricCriteria.length;

  return (
    <Card className="p-6" key={submission.id}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold" style={{ color: "var(--teal)" }}>
            Innovation & Impact
          </h3>
          <p className="text-sm text-muted-foreground">Score each criterion on a 1–5 scale.</p>
        </div>
        <div className="rounded-md border border-border px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Live average
          </div>
          <div className="text-lg font-bold" style={{ color: complete ? "var(--teal)" : "var(--foreground)" }}>
            {filled.length > 0 ? avg.toFixed(2) : "—"}
            <span className="text-xs font-normal text-muted-foreground"> /5</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: complete ? "var(--teal)" : "var(--magenta)" }}>
            {filled.length}/{rubricCriteria.length} scored
          </div>
        </div>
      </div>

      <ul className="space-y-4">
        {rubricCriteria.map((c) => {
          const v = scores[c.id];
          return (
            <li
              key={c.id}
              className="rounded-md border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.description}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{v ?? "—"}</strong>/5
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = v === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setScore(c.id, n)}
                      className="grid h-10 w-10 place-items-center rounded-md border text-sm font-semibold transition-colors"
                      style={
                        active
                          ? {
                              background: "var(--teal)",
                              borderColor: "var(--teal)",
                              color: "#fff",
                            }
                          : {
                              borderColor: "var(--border)",
                              color: "var(--foreground)",
                            }
                      }
                      aria-pressed={active}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Feedback (visible to submitter)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="What worked well? What could be stronger?"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)] focus:ring-2 focus:ring-[color:var(--teal)]/20"
        />
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={togglePrivate}
            className="h-4 w-4 rounded border-border"
            style={{ accentColor: "var(--magenta)" }}
          />
          <span style={{ color: isPrivate ? "var(--magenta)" : "var(--muted-foreground)" }}>
            Private notes (not shared with submitter)
          </span>
        </label>
      </div>

      <div className="mt-6 space-y-3">
        <Button variant="primary" tone="teal" className="w-full" onClick={onNext}>
          Save & Next <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Button>
        <div className="text-center text-xs text-muted-foreground">{position}</div>
      </div>
    </Card>
  );
}
