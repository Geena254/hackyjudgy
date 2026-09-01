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
  repo_url: string | null;
  demo_url: string | null;
  deck_url: string | null;
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

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
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

export function useJudges() {
  return useQuery({
    queryKey: ["judge-roster"],
    queryFn: async () => {
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
      const payload: Record<string, unknown> = {
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
  return scoped.length > 0 ? scoped : criteria;
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
