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
        repo_url: input.repo_url || null,
        demo_url: input.demo_url || null,
        deck_url: input.deck_url || null,
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

/** The currently active (published) event — readable without signing in. */
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

/** Insert a participant's own submission into the active event. */
export function useSubmitProject() {
  return useMutation({
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
    }) => {
      const { data, error } = await supabase.from("submissions").insert({
        event_id: input.event_id,
        round_id: input.round_id || null,
        title: input.title,
        team_name: input.team_name || null,
        category: input.category || null,
        description: input.description || null,
        submitter_name: input.submitter_name || null,
        submitter_email: input.submitter_email || null,
        repo_url: input.repo_url || null,
        demo_url: input.demo_url || null,
        deck_url: input.deck_url || null,
        status: "submitted",
      }).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
  });
}

/** Publicly viewable showcase details for one submission (no contact details). */
export function usePublicSubmission(id: string | undefined) {
  return useQuery({
    queryKey: ["public-submission", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, event_id, round_id, title, team_name, category, description, repo_url, demo_url, deck_url, status, created_at",
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Omit<SubmissionRow, "submitter_name" | "submitter_email"> | null;
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
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, event_id, round_id, title, team_name, category, description, repo_url, demo_url, deck_url, status, created_at",
        )
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicSubmission[];
    },
  });
}

export type PublicSubmission = Omit<SubmissionRow, "submitter_name" | "submitter_email">;

/** Averaged criterion score for one submission — never an individual judge's mark. */
export type PublicScore = {
  submission_id: string;
  criterion_id: string;
  avg_value: number;
  judge_count: number;
};

/** Averaged public scores for a running event — individual judge marks stay private. */
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
  /** Weighted total out of 100 — every criterion scaled by its weight, not a plain sum. */
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
