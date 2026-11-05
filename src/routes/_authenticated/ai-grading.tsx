import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles, Square, X } from "lucide-react";
import { AppShell, Card, Button, Pill, ProgressBar } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useSelectedEvent } from "@/hooks/use-selected-event";
import {
  useEvents,
  useRounds,
  useCriteria,
  useSubmissions,
  useAiReviews,
  useAllScores,
  useJudges,
  criteriaForSubmission,
  finishedJudgeCounts,
  weightedPercent,
  type AiReviewRow,
  type AiReviewStatus,
  type CriterionRow,
  type SubmissionRow,
} from "@/lib/hackathon";
import { gradeSubmissionWithAi, reviewAiResult } from "@/lib/ai-grading.functions";
import { JUDGING_MODES, judgingModeOf } from "@/lib/submission-form";

export const Route = createFileRoute("/_authenticated/ai-grading")({
  head: () => ({
    meta: [
      { title: "AI grading - GavelLab" },
      {
        name: "description",
        content: "Have AI score entries against your rubric, then review and approve each result.",
      },
    ],
  }),
  component: AiGrading,
});

type Filter = "draft" | "approved" | "rejected" | "failed" | "ungraded";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "draft", label: "Waiting for review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "failed", label: "Failed" },
  { key: "ungraded", label: "Not graded" },
];

const STATUS_PILL: Record<
  AiReviewStatus,
  { label: string; tone: "teal" | "magenta" | "gray" | "warning" }
> = {
  draft: { label: "Draft", tone: "warning" },
  approved: { label: "Approved", tone: "teal" },
  rejected: { label: "Rejected", tone: "gray" },
  failed: { label: "Failed", tone: "magenta" },
};

const PAGE_SIZE = 10;

type Run = {
  total: number;
  done: number;
  current: string | null;
  drafted: number;
  skipped: number;
  failures: { title: string; error: string }[];
  stopping: boolean;
};

function AiGrading() {
  const { isAdmin, ready } = useAuth();
  const { data: events = [] } = useEvents();
  const [event] = useSelectedEvent(events);
  const eventId = event?.id;
  const mode = judgingModeOf(event);
  const usesAi = JUDGING_MODES[mode].usesAi;
  const { data: rounds = [] } = useRounds(eventId);
  const { data: criteria = [] } = useCriteria(rounds.map((r) => r.id));
  const { data: subs = [] } = useSubmissions(eventId);
  const { data: aiReviews = [], isSuccess: aiLoaded } = useAiReviews(eventId);
  const queryClient = useQueryClient();
  const grade = useServerFn(gradeSubmissionWithAi);

  const { data: scores = [] } = useAllScores();
  const { data: judges = [] } = useJudges(eventId);

  const byEntry = useMemo(() => new Map(aiReviews.map((r) => [r.submission_id, r])), [aiReviews]);
  const entries = useMemo(() => subs.filter((s) => s.status !== "disqualified"), [subs]);
  // How many judges finished each entry, shown beside its AI result.
  const finished = useMemo(
    () =>
      finishedJudgeCounts({ subs, rounds, criteria, scores, judgeIds: judges.map((j) => j.id) }),
    [subs, rounds, criteria, scores, judges],
  );

  // A run grades entries with no AI result yet, plus rejected and failed ones.
  // Approved results and drafts waiting for review are left alone.
  const queue = useMemo(
    () =>
      usesAi
        ? entries.filter((s) => {
            const status = byEntry.get(s.id)?.status;
            return status !== "approved" && status !== "draft";
          })
        : [],
    [entries, byEntry, usesAi],
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      draft: 0,
      approved: 0,
      rejected: 0,
      failed: 0,
      ungraded: 0,
    };
    for (const s of entries) c[byEntry.get(s.id)?.status ?? "ungraded"] += 1;
    return c;
  }, [entries, byEntry]);

  const [run, setRun] = useState<Run | null>(null);
  const stopRef = useRef(false);
  const running = !!run && run.done < run.total && !(run.stopping && run.current === null);

  async function startRun() {
    const todo = [...queue];
    stopRef.current = false;
    setRun({
      total: todo.length,
      done: 0,
      current: null,
      drafted: 0,
      skipped: 0,
      failures: [],
      stopping: false,
    });
    // One entry at a time, so progress is visible and one failure never stops the rest.
    for (const sub of todo) {
      if (stopRef.current) break;
      setRun((r) => r && { ...r, current: sub.title });
      let outcome: { kind: "drafted" | "skipped" } | { kind: "failed"; error: string };
      try {
        const res = await grade({ data: { submissionId: sub.id, replaceDraft: false } });
        outcome =
          res.status === "failed" ? { kind: "failed", error: res.error } : { kind: res.status };
      } catch (e) {
        outcome = { kind: "failed", error: e instanceof Error ? e.message : "AI grading failed." };
      }
      setRun(
        (r) =>
          r && {
            ...r,
            done: r.done + 1,
            drafted: r.drafted + (outcome.kind === "drafted" ? 1 : 0),
            skipped: r.skipped + (outcome.kind === "skipped" ? 1 : 0),
            failures:
              outcome.kind === "failed"
                ? [...r.failures, { title: sub.title, error: outcome.error }]
                : r.failures,
          },
      );
      queryClient.invalidateQueries({ queryKey: ["ai-reviews", eventId] });
    }
    setRun((r) => r && { ...r, current: null, total: stopRef.current ? r.done : r.total });
  }

  const [filter, setFilter] = useState<Filter>("draft");
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [filter, eventId]);
  const shown = useMemo(
    () => entries.filter((s) => (byEntry.get(s.id)?.status ?? "ungraded") === filter),
    [entries, byEntry, filter],
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  if (ready && !isAdmin) {
    return (
      <AppShell>
        <Card className="p-8 text-sm text-muted-foreground">
          Only organisers can use AI grading.
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Organiser
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">AI grading</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            AI scores each entry against your rubric and drafts feedback in the style your judges
            use. Nothing counts until you approve it. Once approved, the AI result counts as one
            more judge: on an entry no judge has scored it is the score, otherwise it is averaged
            in with the judges' scores. This applies to the results, team reports and public
            standings. Judges never see AI results.
          </p>
        </div>

        {event && !usesAi && (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-foreground">
              AI grading is off for this hackathon
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {event.name} is set to &ldquo;{JUDGING_MODES[mode].label}&rdquo;, so AI results
              don&apos;t count towards the scores. To use AI grading, choose a judging setup with
              AI in{" "}
              <Link to="/events" className="font-semibold" style={{ color: "var(--teal)" }}>
                Hackathon setup
              </Link>
              .
            </p>
          </Card>
        )}

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Sparkles className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
                Grade entries
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {!aiLoaded
                  ? "Loading..."
                  : !usesAi
                    ? "Turned off by this hackathon's judging setup."
                    : queue.length === 0
                      ? "Nothing left to grade. Regenerate a draft from the list below if you need to."
                      : `${queue.length} of ${entries.length} entries to grade.` +
                        (counts.approved + counts.draft > 0
                          ? ` ${counts.approved} approved and ${counts.draft} waiting for review are skipped.`
                          : "")}
              </p>
            </div>
            {running ? (
              <Button
                variant="outline"
                tone="magenta"
                disabled={run?.stopping}
                onClick={() => {
                  stopRef.current = true;
                  setRun((r) => r && { ...r, stopping: true });
                }}
              >
                <Square className="h-4 w-4" strokeWidth={2} />{" "}
                {run?.stopping ? "Stopping..." : "Stop"}
              </Button>
            ) : (
              <Button
                variant="primary"
                tone="teal"
                onClick={startRun}
                disabled={!aiLoaded || queue.length === 0}
              >
                <Sparkles className="h-4 w-4" strokeWidth={2} /> Grade all entries with AI
              </Button>
            )}
          </div>

          {run && (
            <div className="mt-4 space-y-2" aria-live="polite">
              <ProgressBar value={run.total ? (run.done / run.total) * 100 : 100} />
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-foreground">
                  {running && run.current
                    ? `Grading ${run.done + 1} of ${run.total}: ${run.current}`
                    : run.stopping
                      ? `Stopped after ${run.done} entries.`
                      : `Finished ${run.done} of ${run.total}.`}
                </span>
                <span className="text-muted-foreground">
                  {run.drafted} drafted · {run.skipped} skipped · {run.failures.length} failed
                </span>
              </div>
              {run.failures.length > 0 && (
                <ul className="space-y-1 rounded-md border border-border bg-muted/40 p-3 text-xs">
                  {run.failures.map((f, i) => (
                    <li key={i}>
                      <span className="font-semibold text-foreground">{f.title}:</span>{" "}
                      <span className="text-muted-foreground">{f.error}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-2" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full border px-3 py-1.5 text-sm font-semibold " +
                (filter === f.key
                  ? "border-transparent text-white"
                  : "border-border text-muted-foreground hover:bg-muted")
              }
              style={filter === f.key ? { background: "var(--teal)" } : undefined}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {rows.map((s) => (
            <EntryResult
              key={s.id}
              submission={s}
              rubric={criteriaForSubmission(s, rounds, criteria)}
              review={byEntry.get(s.id)}
              busy={running}
              finishedJudges={finished.get(s.id) ?? 0}
              usesAi={usesAi}
            />
          ))}
          {rows.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">Nothing here.</Card>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              {current * PAGE_SIZE + 1}-{Math.min(shown.length, (current + 1) * PAGE_SIZE)} of{" "}
              {shown.length} entries
            </span>
            <button
              className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label="Previous entries"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              aria-label="Next entries"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/** One entry's AI result: scores and feedback the organiser can edit, approve or reject. */
function EntryResult({
  submission,
  rubric,
  review,
  busy,
  finishedJudges,
  usesAi,
}: {
  submission: SubmissionRow;
  rubric: CriterionRow[];
  review: AiReviewRow | undefined;
  busy: boolean;
  /** Panel judges who have scored every criterion of this entry. */
  finishedJudges: number;
  usesAi: boolean;
}) {
  const queryClient = useQueryClient();
  const decide = useServerFn(reviewAiResult);
  const grade = useServerFn(gradeSubmissionWithAi);

  const initialScores = () =>
    Object.fromEntries((review?.scores ?? []).map((s) => [s.criterion_id, String(s.value)]));
  const [scores, setScores] = useState<Record<string, string>>(initialScores);
  const [feedback, setFeedback] = useState(review?.feedback ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pick up a fresh result (a regenerate or another organiser's change).
  useEffect(() => {
    setScores(initialScores());
    setFeedback(review?.feedback ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.updated_at]);

  const editable = review?.status === "draft" || review?.status === "rejected";
  const values = Object.fromEntries(
    Object.entries(scores)
      .filter(([, v]) => v !== "" && Number.isFinite(Number(v)))
      .map(([k, v]) => [k, Number(v)]),
  );
  const total = weightedPercent(rubric, values);
  const dirty =
    feedback !== (review?.feedback ?? "") ||
    (review?.scores ?? []).some((s) => Number(scores[s.criterion_id]) !== s.value);

  async function act(label: string, fn: () => Promise<unknown>) {
    setPending(label);
    setError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["ai-reviews"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  const edits = () => ({
    feedback,
    scores: rubric
      .filter((c) => scores[c.id] !== undefined && scores[c.id] !== "")
      .map((c) => ({ criterion_id: c.id, value: Number(scores[c.id]) })),
  });

  const regenerate = () =>
    act("regenerate", async () => {
      const res = await grade({ data: { submissionId: submission.id, replaceDraft: true } });
      if (res.status === "failed") throw new Error(res.error);
      if (res.status === "skipped") throw new Error(res.reason);
    });

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-foreground">{submission.title}</div>
          {submission.team_name && (
            <div className="text-xs text-muted-foreground">{submission.team_name}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {total !== null && review && review.status !== "failed" && (
            <span className="text-base font-bold tabular-nums" style={{ color: "var(--teal)" }}>
              {total}/100
            </span>
          )}
          {review ? (
            <Pill tone={STATUS_PILL[review.status].tone}>{STATUS_PILL[review.status].label}</Pill>
          ) : (
            <Pill tone="gray" variant="outline">
              Not graded
            </Pill>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {!usesAi
          ? "AI grading is off for this hackathon, so this result doesn't count."
          : finishedJudges === 0
            ? "No judge has scored this entry yet. Once approved, the AI result is its score."
            : `${finishedJudges} ${finishedJudges === 1 ? "judge has" : "judges have"} scored this entry. Once approved, the AI result is averaged in with theirs.`}
      </p>

      {review && review.status !== "failed" && review.sources.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">AI read:</span>{" "}
          {review.sources.filter((s) => !s.startsWith("Not read: ")).join(", ") ||
            "description only"}
          {review.sources.some((s) => s.startsWith("Not read: ")) && (
            <>
              {". "}
              <span className="font-semibold text-foreground">Couldn't read:</span>{" "}
              {review.sources
                .filter((s) => s.startsWith("Not read: "))
                .map((s) => s.slice("Not read: ".length))
                .join(", ")}
            </>
          )}
        </p>
      )}

      {review?.status === "failed" && (
        <p className="mt-3 text-sm text-muted-foreground">{review.error}</p>
      )}

      {review && review.status !== "failed" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,260px)_1fr]">
          <div className="space-y-2">
            {rubric.map((c) => (
              <label key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{c.name}</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <input
                    type="number"
                    min={0}
                    max={c.max_score || 5}
                    step={0.5}
                    value={scores[c.id] ?? ""}
                    disabled={!editable}
                    onChange={(e) => setScores((s) => ({ ...s, [c.id]: e.target.value }))}
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right disabled:opacity-70"
                  />
                  <span className="text-muted-foreground">/{c.max_score || 5}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Feedback to the team
            </span>
            <textarea
              value={feedback}
              disabled={!editable}
              onChange={(e) => setFeedback(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-md border border-border bg-background p-3 text-sm disabled:opacity-80"
            />
          </label>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--magenta)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {editable && (
          <>
            {dirty && (
              <Button
                variant="ghost"
                disabled={!!pending}
                onClick={() =>
                  act("save", () =>
                    decide({ data: { id: review!.id, action: "save", ...edits() } }),
                  )
                }
              >
                {pending === "save" ? "Saving..." : "Save edits"}
              </Button>
            )}
            <Button variant="outline" tone="teal" disabled={!!pending || busy} onClick={regenerate}>
              <RotateCcw className="h-4 w-4" />{" "}
              {pending === "regenerate" ? "Regenerating..." : "Regenerate"}
            </Button>
            {review!.status === "draft" && (
              <Button
                variant="outline"
                tone="magenta"
                disabled={!!pending}
                onClick={() =>
                  act("reject", () =>
                    decide({ data: { id: review!.id, action: "reject", ...edits() } }),
                  )
                }
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            )}
            <Button
              variant="primary"
              tone="teal"
              disabled={!!pending}
              onClick={() =>
                act("approve", () =>
                  decide({ data: { id: review!.id, action: "approve", ...edits() } }),
                )
              }
            >
              <Check className="h-4 w-4" /> {pending === "approve" ? "Approving..." : "Approve"}
            </Button>
          </>
        )}
        {review?.status === "approved" && (
          <Button
            variant="outline"
            tone="teal"
            disabled={!!pending}
            onClick={() =>
              act("reopen", () => decide({ data: { id: review.id, action: "reopen" } }))
            }
          >
            <RotateCcw className="h-4 w-4" /> Move back to draft
          </Button>
        )}
        {(!review || review.status === "failed") && (
          <Button variant="outline" tone="teal" disabled={!!pending || busy} onClick={regenerate}>
            <Sparkles className="h-4 w-4" />{" "}
            {pending === "regenerate" ? "Grading..." : "Grade with AI"}
          </Button>
        )}
      </div>
    </Card>
  );
}
