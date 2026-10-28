import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Phase = "submissions" | "judging" | "results";
export type EventStatus = "draft" | "active" | "closed";
export type SubmissionStatus =
  | "submitted"
  | "under_review"
  | "scored"
  | "ranked"
  | "disqualified";

export type EventRow = {
  id: string;
  name: string;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: EventStatus;
  /** Show the public live standings while judging runs. */
  show_live_rankings: boolean;
  /** Concept note / brief for entrants. */
  brief_url: string | null;
  /** When the public entry form stops taking entries; null keeps it open while published. */
  submissions_close_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type RoundRow = {
  id: string;
  event_id: string;
  name: string;
  phase: Phase;
  deadline: string | null;
  submission_method: string | null;
  sort_order: number;
};

export type CriterionRow = {
  id: string;
  round_id: string;
  name: string;
  description: string | null;
  weight: number;
  max_score: number;
  sort_order: number;
};

export type SubmissionRow = {
  id: string;
  event_id: string;
  round_id: string | null;
  title: string;
  team_name: string | null;
  category: string | null;
  description: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  /** Teammates' emails for team entries (private, like submitter_email). */
  team_member_emails: string[];
  repo_url: string | null;
  /** Live prototype / site. */
  demo_url: string | null;
  deck_url: string | null;
  /** Recorded video demo. */
  video_url: string | null;
  concept_note_url: string | null;
  status: SubmissionStatus;
  created_at: string;
};

export type ScoreRow = {
  id: string;
  submission_id: string;
  criterion_id: string;
  judge_id: string;
  value: number;
};

export type ReviewRow = {
  id: string;
  submission_id: string;
  judge_id: string;
  feedback: string | null;
  private_notes: string | null;
  completed: boolean;
  updated_at: string;
};

export const PHASES: Phase[] = ["submissions", "judging", "results"];

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  scored: "Scored",
  ranked: "Ranked",
  disqualified: "Disqualified",
};

/* ---------------------------------- reads --------------------------------- */

/** Hackathons the signed-in user works on: all for admins, their own for organisers, judged ones for judges. */
export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("workspace_events");
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });
}

export function useRounds(eventId: string | undefined) {
  return useQuery({
    queryKey: ["rounds", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("event_id", eventId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as RoundRow[];
    },
  });
}

export function useCriteria(roundIds: string[]) {
  const key = [...roundIds].sort().join(",");
  return useQuery({
    queryKey: ["criteria", key],
    enabled: roundIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criteria")
        .select("*")
        .in("round_id", roundIds)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CriterionRow[];
    },
  });
}

export function useSubmissions(eventId: string | undefined) {
  return useQuery({
    queryKey: ["submissions", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SubmissionRow[];
    },
  });
}

export function useMyScores(judgeId: string | undefined) {
  return useQuery({
    queryKey: ["scores", "mine", judgeId],
    enabled: !!judgeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scores")
        .select("id, submission_id, criterion_id, judge_id, value")
        .eq("judge_id", judgeId!);
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });
}

export function useMyReviews(judgeId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "mine", judgeId],
    enabled: !!judgeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, submission_id, judge_id, feedback, private_notes, completed, updated_at")
        .eq("judge_id", judgeId!);
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });
}

/** Admin-only: every judge's scores (RLS allows admins to read all). */
export function useAllScores() {
  return useQuery({
    queryKey: ["scores", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scores")
        .select("id, submission_id, criterion_id, judge_id, value");
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });
}

/* ------------------------------- AI grading ------------------------------- */

export type AiReviewStatus = "draft" | "approved" | "rejected" | "failed";

export type AiReviewRow = {
  id: string;
  submission_id: string;
  status: AiReviewStatus;
  feedback: string | null;
  error: string | null;
  model: string | null;
  reviewed_at: string | null;
  updated_at: string;
  /** What the AI read (README, deck...) and which links it couldn't; empty before it was recorded. */
  sources: string[];
  scores: { criterion_id: string; value: number }[];
};

/** Organiser-only: Claude's draft and approved results for a hackathon (RLS hides them from judges). */
export function useAiReviews(eventId: string | undefined) {
  return useQuery({
    queryKey: ["ai-reviews", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      // "*" so this keeps working on a database without the newer sources column.
      const { data, error } = await supabase
        .from("ai_reviews")
        .select("*, ai_scores(criterion_id, value)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return (data ?? []).map(({ ai_scores, ...row }) => ({
        ...row,
        sources: row.sources ?? [],
        status: row.status as AiReviewStatus,
        scores: (ai_scores ?? []).map((s) => ({ criterion_id: s.criterion_id, value: Number(s.value) })),
      })) as AiReviewRow[];
    },
  });
}

/** Stands in for a judge id wherever approved AI results are counted. */
export const AI_JUDGE_ID = "ai-judge";
export const AI_JUDGE = { id: AI_JUDGE_ID, name: "AI judge", email: "" };

/**
 * AI is a fallback for entries the panel hasn't covered: its approved result
 * counts while at most this many judges have finished scoring the entry.
 */
export const AI_FALLBACK_MAX_JUDGES = 2;

type PanelContext = {
  subs: SubmissionRow[];
  rounds: RoundRow[];
  criteria: CriterionRow[];
  /** Panel judges' scores (no AI scores). */
  scores: ScoreRow[];
  judgeIds: string[];
};

/** How many panel judges have scored every criterion of each entry. */
export function finishedJudgeCounts({ subs, rounds, criteria, scores, judgeIds }: PanelContext) {
  const counts = new Map<string, number>();
  for (const s of subs) {
    const crit = criteriaForSubmission(s, rounds, criteria);
    const finished = judgeIds.filter((j) => {
      const vals = scoreMap(scores, s.id, j);
      return crit.length > 0 && crit.every((c) => vals[c.id] !== undefined);
    }).length;
    counts.set(s.id, finished);
  }
  return counts;
}

/** Does this entry's approved AI result count, given how many judges finished it? */
export const aiCounts = (finishedJudges: number) => finishedJudges <= AI_FALLBACK_MAX_JUDGES;

/**
 * Approved AI results as one more judge: their scores and feedback in the same
 * shape as a panel judge's. Drafts and rejected results are left out, and so are
 * entries already finished by more than AI_FALLBACK_MAX_JUDGES judges.
 */
export function aiJudgeMarks(aiReviews: AiReviewRow[], panel: PanelContext) {
  const finished = finishedJudgeCounts(panel);
  const approved = aiReviews.filter(
    (r) => r.status === "approved" && aiCounts(finished.get(r.submission_id) ?? 0),
  );
  const scores: ScoreRow[] = approved.flatMap((r) =>
    r.scores.map((s) => ({
      id: `ai-${r.id}-${s.criterion_id}`,
      submission_id: r.submission_id,
      criterion_id: s.criterion_id,
      judge_id: AI_JUDGE_ID,
      value: s.value,
    })),
  );
  const reviews: ReviewRow[] = approved.map((r) => ({
    id: `ai-${r.id}`,
    submission_id: r.submission_id,
    judge_id: AI_JUDGE_ID,
    feedback: r.feedback,
    private_notes: null,
    completed: true,
    updated_at: r.reviewed_at ?? r.updated_at,
  }));
  return { active: approved.length > 0, scores, reviews };
}

/* ----------------------- sharing entries out to judges --------------------- */

export type AssignmentRow = { submission_id: string; judge_id: string };

/** Hackathons with more than this many entries can be shared out between judges. */
export const SHARE_OUT_THRESHOLD = 10;

/** Which judge each entry was given to, for a shared-out hackathon (empty = not shared out). */
export function useAssignments(eventId: string | undefined) {
  return useQuery({
    queryKey: ["assignments", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judge_assignments")
        .select("submission_id, judge_id")
        .eq("event_id", eventId!);
      if (error) throw error;
      return (data ?? []) as AssignmentRow[];
    },
  });
}

/**
 * Who is expected to score each entry: every panel judge, or once the
 * hackathon is shared out, only the judge(s) it was given to.
 */
export function panelFor(assignments: AssignmentRow[]) {
  const byEntry = new Map<string, Set<string>>();
  for (const a of assignments) {
    if (!byEntry.has(a.submission_id)) byEntry.set(a.submission_id, new Set());
    byEntry.get(a.submission_id)!.add(a.judge_id);
  }
  const sharedOut = assignments.length > 0;
  return {
    sharedOut,
    /** Should this judge score this entry? */
    expects: (judgeId: string, submissionId: string) =>
      !sharedOut || (byEntry.get(submissionId)?.has(judgeId) ?? false),
    judgesOf: <J extends { id: string }>(submissionId: string, judges: J[]) =>
      sharedOut ? judges.filter((j) => byEntry.get(submissionId)?.has(j.id)) : judges,
  };
}

function useShareOutMutation(fn: "share_out_entries" | "undo_share_out") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.rpc(fn, { _event_id: eventId });
      if (error) throw error;
      return typeof data === "number" ? data : null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

/** Share entries out evenly (or rebalance work nobody has started). */
export const useShareOut = () => useShareOutMutation("share_out_entries");
/** Back to every judge scoring every entry. */
export const useUndoShareOut = () => useShareOutMutation("undo_share_out");

/** Admin-only: every judge's review progress. */
export function useAllReviews() {
  return useQuery({
    queryKey: ["reviews", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, submission_id, judge_id, feedback, private_notes, completed, updated_at");
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });
}

/**
 * Judges visible to the signed-in organiser. With an event, only that hackathon's
 * panel - so progress figures never count other organisers' judges.
 */
export function useJudges(eventId?: string) {
  return useQuery({
    queryKey: ["judge-roster", eventId ?? "all"],
    queryFn: async () => {
      if (eventId) {
        const { data, error } = await supabase.rpc("event_judges", { _event_id: eventId });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          id: row.id,
          name: row.full_name ?? row.email ?? "Judge",
          email: row.email ?? "",
        }));
      }
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "judge");
      if (error) throw error;
      const ids = (roles ?? []).map((r) => (r as { user_id: string }).user_id);
      if (ids.length === 0) return [] as { id: string; name: string; email: string }[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return (profiles ?? []).map((p) => {
        const row = p as { id: string; full_name: string | null; email: string | null };
        return {
          id: row.id,
          name: row.full_name ?? row.email ?? "Judge",
          email: row.email ?? "",
        };
      });
    },
  });
}

/** Who organised each hackathon (id → email or name). Platform admins can read every profile. */
export function useOrganisers(userIds: (string | null)[]) {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))].sort();
  return useQuery({
    queryKey: ["organisers", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Unknown organiser"]),
      ) as Record<string, string>;
    },
  });
}

/* --------------------------------- writes -------------------------------- */

function useInvalidate(keys: string[][]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
}

export function useSaveScore(judgeId: string | undefined) {
  const invalidate = useInvalidate([["scores"]]);
  return useMutation({
    mutationFn: async (input: { submissionId: string; criterionId: string; value: number }) => {
      if (!judgeId) throw new Error("Not signed in");
      const { error } = await supabase.from("scores").upsert(
        {
          submission_id: input.submissionId,
          criterion_id: input.criterionId,
          judge_id: judgeId,
          value: input.value,
        },
        { onConflict: "submission_id,criterion_id,judge_id" },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveReview(judgeId: string | undefined) {
  const invalidate = useInvalidate([["reviews"]]);
  return useMutation({
    mutationFn: async (input: {
      submissionId: string;
      feedback?: string;
      privateNotes?: string;
      completed?: boolean;
    }) => {
      if (!judgeId) throw new Error("Not signed in");
      const payload: {
        submission_id: string;
        judge_id: string;
        feedback?: string;
        private_notes?: string;
        completed?: boolean;
      } = {
        submission_id: input.submissionId,
        judge_id: judgeId,
      };
      if (input.feedback !== undefined) payload.feedback = input.feedback;
      if (input.privateNotes !== undefined) payload.private_notes = input.privateNotes;
      if (input.completed !== undefined) payload.completed = input.completed;
      const { error } = await supabase
        .from("reviews")
        .upsert(payload, { onConflict: "submission_id,judge_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/* -------------------------------- scoring -------------------------------- */

/** Criteria that apply to a submission: its own round, else the first judging round. */
export function criteriaForSubmission(
  submission: Pick<SubmissionRow, "round_id"> | undefined,
  rounds: RoundRow[],
  criteria: CriterionRow[],
) {
  if (!submission) return [];
  const judging = rounds.find((r) => r.phase === "judging") ?? rounds[0];
  const roundId = submission.round_id ?? judging?.id;
  const scoped = criteria.filter((c) => c.round_id === roundId);
  if (scoped.length > 0) return scoped;
  // Entries still in a round without a rubric (e.g. the submissions round) are
  // scored on the first judging round's rubric, not every round's criteria.
  const judged = criteria.filter((c) => c.round_id === judging?.id);
  return judged.length > 0 ? judged : criteria;
}

/** Weighted score as a percentage (0-100) for one judge's scores on one submission. */
export function weightedPercent(criteria: CriterionRow[], values: Record<string, number>) {
  const scored = criteria.filter((c) => values[c.id] !== undefined);
  if (scored.length === 0) return null;
  const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0) || 1;
  const earned = scored.reduce(
    (sum, c) => sum + c.weight * (values[c.id]! / (c.max_score || 5)),
    0,
  );
  return Math.round((earned / totalWeight) * 100);
}

export function scoreMap(scores: ScoreRow[], submissionId: string, judgeId?: string) {
  const map: Record<string, number> = {};
  for (const s of scores) {
    if (s.submission_id !== submissionId) continue;
    if (judgeId && s.judge_id !== judgeId) continue;
    map[s.criterion_id] = s.value;
  }
  return map;
}

export function daysLeft(endsOn: string | null | undefined) {
  if (!endsOn) return null;
  const end = new Date(`${endsOn}T23:59:59Z`).getTime();
  const diff = Math.ceil((end - Date.now()) / 86_400_000);
  return diff;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "No date set";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** e.g. "23 Oct 2026, 11:59 PM", in the viewer's own time zone. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "No date set";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** True once the hackathon's submission period is over. */
export function submissionsClosed(event: Pick<EventRow, "submissions_close_at">, now = Date.now()) {
  return !!event.submissions_close_at && new Date(event.submissions_close_at).getTime() <= now;
}

/** The current time, refreshed every `everyMs`, so deadlines lapse on an open page. */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

/** "1d 14h", "3h 20m" or "12m" until `value`; null once it has passed. */
export function timeUntil(value: string | null | undefined, now = Date.now()) {
  if (!value) return null;
  const mins = Math.floor((new Date(value).getTime() - now) / 60_000);
  if (mins <= 0) return null;
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ----------------------------- admin mutations ---------------------------- */

export function useSaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<EventRow> & { id?: string; name: string }) => {
      const payload = {
        name: input.name,
        description: input.description ?? null,
        starts_on: input.starts_on || null,
        ends_on: input.ends_on || null,
        status: input.status ?? "draft",
        show_live_rankings: input.show_live_rankings ?? true,
        brief_url: input.brief_url || null,
        submissions_close_at: input.submissions_close_at || null,
      };
      if (input.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useSaveRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      event_id: string;
      name: string;
      phase: Phase;
      deadline?: string | null;
      submission_method?: string | null;
      sort_order?: number;
    }) => {
      const payload = {
        event_id: input.event_id,
        name: input.name,
        phase: input.phase,
        deadline: input.deadline || null,
        submission_method: input.submission_method || null,
        sort_order: input.sort_order ?? 0,
      };
      if (input.id) {
        const { error } = await supabase.from("rounds").update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase.from("rounds").insert(payload).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rounds"] }),
  });
}

export function useDeleteRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rounds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rounds"] });
      qc.invalidateQueries({ queryKey: ["criteria"] });
    },
  });
}

export function useSaveCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      round_id: string;
      name: string;
      description?: string | null;
      weight: number;
      max_score: number;
      sort_order?: number;
    }) => {
      const payload = {
        round_id: input.round_id,
        name: input.name,
        description: input.description ?? null,
        weight: input.weight,
        max_score: input.max_score,
        sort_order: input.sort_order ?? 0,
      };
      if (input.id) {
        const { error } = await supabase.from("criteria").update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("criteria")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criteria"] }),
  });
}

export function useDeleteCriterion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("criteria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criteria"] }),
  });
}

export function useSaveSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SubmissionRow> & { event_id: string; title: string }) => {
      const payload = {
        event_id: input.event_id,
        round_id: input.round_id || null,
        title: input.title,
        team_name: input.team_name || null,
        category: input.category || null,
        description: input.description || null,
        submitter_name: input.submitter_name || null,
        submitter_email: input.submitter_email || null,
        team_member_emails: input.team_member_emails ?? [],
        repo_url: input.repo_url || null,
        demo_url: input.demo_url || null,
        deck_url: input.deck_url || null,
        video_url: input.video_url || null,
        concept_note_url: input.concept_note_url || null,
        status: input.status ?? "submitted",
      };
      if (input.id) {
        const { error } = await supabase.from("submissions").update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("submissions")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

export function useDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

/* ------------------------------ public reads ------------------------------ */

/** The currently active (published) event - readable without signing in. */
export function useActiveEvent() {
  return useQuery({
    queryKey: ["active-event"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as EventRow | null;
    },
  });
}

/** Every published hackathon on the platform, soonest-ending first - readable without signing in. */
export function usePublicEvents() {
  return useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      // Filter explicitly: signed-in admins can also read drafts and closed events.
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "active")
        .order("ends_on", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });
}

/** Insert a participant's own submission into the active event. */
export function useSubmitProject() {
  const qc = useQueryClient();
  return useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["public-submissions"] });
    },
    mutationFn: async (input: {
      event_id: string;
      round_id?: string | null;
      title: string;
      team_name?: string;
      category?: string;
      description?: string;
      submitter_name?: string;
      submitter_email?: string;
      repo_url?: string;
      demo_url?: string;
      deck_url?: string;
      video_url?: string;
      team_member_emails?: string[];
    }) => {
      // Signed-out entrants can't write to or read submissions directly; the
      // submit_entry function checks the hackathon is open and returns the new id.
      const { data, error } = await supabase.rpc("submit_entry", {
        _event_id: input.event_id,
        _round_id: input.round_id || undefined,
        _title: input.title,
        _team_name: input.team_name || undefined,
        _category: input.category || undefined,
        _description: input.description ?? "",
        _submitter_name: input.submitter_name ?? "",
        _submitter_email: input.submitter_email ?? "",
        _repo_url: input.repo_url || undefined,
        _demo_url: input.demo_url || undefined,
        _deck_url: input.deck_url || undefined,
        _video_url: input.video_url || undefined,
        _team_member_emails: input.team_member_emails ?? [],
      });
      if (error) throw error;
      return data;
    },
  });
}

/** Publicly viewable showcase details for one submission (no contact details). */
export function usePublicSubmission(id: string | undefined) {
  return useQuery({
    queryKey: ["public-submission", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_submission", { _id: id! });
      if (error) throw error;
      const rows = (data ?? []) as PublicSubmission[];
      return rows[0] ?? null;
    },
  });
}


/** Public event lookup by id (only active events are readable without signing in). */
export function usePublicEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["public-event", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EventRow | null;
    },
  });
}

/* ----------------------- public standings (live board) --------------------- */

/** Public submissions for one event (no submitter contact details). */
export function usePublicSubmissions(eventId: string | undefined) {
  return useQuery({
    queryKey: ["public-submissions", eventId],
    enabled: !!eventId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_submissions", { _event_id: eventId! });
      if (error) throw error;
      return (data ?? []) as PublicSubmission[];
    },

  });
}

export type PublicSubmission = Omit<
  SubmissionRow,
  "submitter_name" | "submitter_email" | "team_member_emails"
>;

/** Averaged criterion score for one submission - never an individual judge's mark. */
export type PublicScore = {
  submission_id: string;
  criterion_id: string;
  avg_value: number;
  judge_count: number;
};

/** Averaged public scores for a running event - individual judge marks stay private. */
export function usePublicScores(eventId: string | undefined) {
  return useQuery({
    queryKey: ["public-score-averages", eventId],
    enabled: !!eventId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_score_averages", {
        _event_id: eventId!,
      });
      if (error) throw error;
      return ((data ?? []) as PublicScore[]).map((r) => ({
        ...r,
        avg_value: Number(r.avg_value),
      }));
    },
  });
}


export type CriterionContribution = {
  criterion: CriterionRow;
  /** Mean judge score on this criterion (raw, e.g. 4.2 out of 5). */
  average: number | null;
  /** Points this criterion adds to the weighted total, out of 100. */
  points: number;
  /** Maximum points this criterion could add, out of 100. */
  maxPoints: number;
  judgeCount: number;
};

export type Standing = {
  submission: PublicSubmission;
  /** Weighted total out of 100 - every criterion scaled by its weight, not a plain sum. */
  weightedTotal: number | null;
  /** Plain unweighted mean of criterion percentages, for comparison. */
  simpleTotal: number | null;
  rank: number | null;
  judgeCount: number;
  breakdown: CriterionContribution[];
};

/**
 * Ranks submissions on a weighted total: each criterion's mean judge score is
 * converted to a share of its own maximum, multiplied by that criterion's weight,
 * and divided by the total weight of scored criteria. The per-criterion `points`
 * show exactly how much each criterion moved the final ranking.
 */
export function buildStandings(
  submissions: PublicSubmission[],
  criteria: CriterionRow[],
  scores: PublicScore[],
  rounds: RoundRow[] = [],
): Standing[] {
  const rows = submissions.map((submission) => {
    const scoped = criteriaForSubmission(submission, rounds, criteria);
    const totalWeight = scoped.reduce((sum, c) => sum + (c.weight || 0), 0) || 1;
    const mine = scores.filter((s) => s.submission_id === submission.id);

    const breakdown: CriterionContribution[] = scoped.map((criterion) => {
      const row = mine.find((s) => s.criterion_id === criterion.id);
      const average = row ? row.avg_value : null;
      const maxPoints = ((criterion.weight || 0) / totalWeight) * 100;
      const points = average === null ? 0 : (average / (criterion.max_score || 5)) * maxPoints;
      return {
        criterion,
        average,
        points: Math.round(points * 10) / 10,
        maxPoints: Math.round(maxPoints * 10) / 10,
        judgeCount: row?.judge_count ?? 0,
      };
    });


    const scoredParts = breakdown.filter((b) => b.average !== null);
    const weightedTotal =
      scoredParts.length === 0
        ? null
        : Math.round(
            (scoredParts.reduce((sum, b) => sum + b.points, 0) /
              (scoredParts.reduce((sum, b) => sum + b.maxPoints, 0) || 1)) *
              1000,
          ) / 10;
    const simpleTotal =
      scoredParts.length === 0
        ? null
        : Math.round(
            (scoredParts.reduce(
              (sum, b) => sum + (b.average! / (b.criterion.max_score || 5)) * 100,
              0,
            ) /
              scoredParts.length) *
              10,
          ) / 10;

    const maxJudges = Math.max(0, ...breakdown.map((b) => b.judgeCount));
    return { submission, weightedTotal, simpleTotal, breakdown, judgeCount: maxJudges };
  });

  const ranked = [...rows].sort(
    (a, b) => (b.weightedTotal ?? -1) - (a.weightedTotal ?? -1),
  );
  return ranked.map((row, i) => ({
    ...row,
    rank: row.weightedTotal === null ? null : i + 1,
  }));
}
