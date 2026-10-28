import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EntryMaterials } from "@/lib/entry-materials.server";
import type { Criterion, Grade } from "@/lib/ai-grading.server";

// Judges' feedback shown to the model as style examples.
const MAX_STYLE_EXAMPLES = 8;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserClient = any;

export type AiGradeResult =
  | { status: "drafted"; submissionId: string }
  | { status: "skipped"; submissionId: string; reason: string }
  | { status: "failed"; submissionId: string; error: string };

async function assertOrganiser(supabase: UserClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "organiser"]);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Only organisers can use AI grading.");
}

/** The rubric an entry is scored on (same rule as criteriaForSubmission in hackathon.ts). */
function rubricFor(
  submission: { round_id: string | null },
  rounds: { id: string; phase: string; sort_order: number }[],
  criteria: Criterion[],
) {
  const judging = rounds.find((r) => r.phase === "judging") ?? rounds[0];
  const roundId = submission.round_id ?? judging?.id;
  const scoped = criteria.filter((c) => c.round_id === roundId);
  const judged = criteria.filter((c) => c.round_id === judging?.id);
  const list = scoped.length > 0 ? scoped : judged.length > 0 ? judged : criteria;
  return [...list].sort((a, b) => a.sort_order - b.sort_order);
}

/** Past judges' feedback the organiser can see, newest first, this hackathon's before others'. */
async function styleExamples(supabase: UserClient, eventId: string, excludeSubmissionId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("feedback, submission_id, updated_at, submissions!inner(event_id)")
    .not("feedback", "is", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const rows = (
    (data ?? []) as {
      feedback: string | null;
      submission_id: string;
      submissions: { event_id: string } | null;
    }[]
  ).filter(
    (r) => r.submission_id !== excludeSubmissionId && (r.feedback ?? "").trim().length >= 40,
  );
  const sameEvent = rows.filter((r) => r.submissions?.event_id === eventId);
  const others = rows.filter((r) => r.submissions?.event_id !== eventId);
  return [...sameEvent, ...others]
    .slice(0, MAX_STYLE_EXAMPLES)
    .map((r) => (r.feedback ?? "").slice(0, 1500));
}

/**
 * Have Claude score one entry and save the result as a draft for the organiser
 * to review. Entries with an approved AI result are always skipped; existing
 * drafts are kept unless `replaceDraft` is set, so edits are never lost by a re-run.
 */
export const gradeSubmissionWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ submissionId: z.string().uuid(), replaceDraft: z.boolean().default(false) }),
  )
  .handler(async ({ data, context }): Promise<AiGradeResult> => {
    const { supabase, userId } = context;
    const submissionId = data.submissionId;
    await assertOrganiser(supabase, userId);
    if (!process.env["ANTHROPIC_API_KEY"]) {
      return {
        status: "failed",
        submissionId,
        error: "AI grading is not set up: ANTHROPIC_API_KEY is missing.",
      };
    }

    const { data: sub, error: subError } = await supabase
      .from("submissions")
      .select(
        "id, event_id, round_id, title, team_name, category, description, repo_url, demo_url, deck_url, video_url, concept_note_url, status",
      )
      .eq("id", submissionId)
      .maybeSingle();
    if (subError) throw new Error(subError.message);
    if (!sub) throw new Error("Entry not found.");

    // Only this hackathon's organisers can read or write its AI results (RLS).
    const { data: existing, error: existingError } = await supabase
      .from("ai_reviews")
      .select("id, status")
      .eq("submission_id", sub.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing?.status === "approved") {
      return { status: "skipped", submissionId, reason: "Already approved" };
    }
    if (existing?.status === "draft" && !data.replaceDraft) {
      return { status: "skipped", submissionId, reason: "Draft waiting for review" };
    }
    if (sub.status === "disqualified") {
      return { status: "skipped", submissionId, reason: "Disqualified" };
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name")
      .eq("id", sub.event_id)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    if (!event) throw new Error("Hackathon not found.");

    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("id, phase, sort_order")
      .eq("event_id", event.id);
    if (roundsError) throw new Error(roundsError.message);
    const roundIds = (rounds ?? []).map((r) => r.id);
    const { data: criteria, error: criteriaError } = roundIds.length
      ? await supabase
          .from("criteria")
          .select("id, round_id, name, description, weight, max_score, sort_order")
          .in("round_id", roundIds)
      : { data: [], error: null };
    if (criteriaError) throw new Error(criteriaError.message);
    const rubric = rubricFor(sub, rounds ?? [], (criteria ?? []) as Criterion[]);
    if (rubric.length === 0) {
      return {
        status: "failed",
        submissionId,
        error: "This hackathon has no rubric to score against.",
      };
    }

    let grade: z.infer<typeof Grade>;
    let model: string;
    let materials: EntryMaterials = { sections: [], read: [], unread: [] };
    // Server-only modules: the Claude SDK and link fetching never reach the browser bundle.
    const ai = await import("@/lib/ai-grading.server");
    try {
      const { readEntryMaterials } = await import("@/lib/entry-materials.server");
      const [examples, read] = await Promise.all([
        styleExamples(supabase, event.id, sub.id),
        readEntryMaterials(sub),
      ]);
      materials = read;
      ({ grade, model } = await ai.askClaude(
        ai.systemPrompt(event.name, rubric, examples),
        ai.entryPrompt(sub, materials),
      ));
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI grading failed.";
      console.error("gradeSubmissionWithAi failed", submissionId, e);
      // Keep an existing draft as it was; otherwise record the failure so a re-run retries it.
      if (existing?.status !== "draft") {
        await supabase.from("ai_reviews").upsert(
          {
            event_id: event.id,
            submission_id: sub.id,
            status: "failed",
            error: message,
            created_by: userId,
          },
          { onConflict: "submission_id" },
        );
      }
      return { status: "failed", submissionId, error: message };
    }

    // Keep each score on the criterion's own scale, in half points.
    const values = rubric.map((c) => {
      const raw = grade.scores.find((s) => s.criterion_id === c.id)?.score;
      const max = c.max_score || 5;
      const value =
        raw === undefined || !Number.isFinite(raw)
          ? 0
          : Math.round(Math.min(max, Math.max(0, raw)) * 2) / 2;
      return { criterion_id: c.id, value };
    });
    if (
      grade.scores.filter((s) => rubric.some((c) => c.id === s.criterion_id)).length < rubric.length
    ) {
      console.warn("gradeSubmissionWithAi: Claude skipped some criteria", submissionId);
    }

    const { data: saved, error: saveError } = await supabase
      .from("ai_reviews")
      .upsert(
        {
          event_id: event.id,
          submission_id: sub.id,
          status: "draft",
          feedback: ai.plainDashes(grade.feedback),
          error: null,
          model,
          created_by: userId,
          reviewed_by: null,
          reviewed_at: null,
        },
        { onConflict: "submission_id" },
      )
      .select("id")
      .single();
    if (saveError) throw new Error(saveError.message);

    const { error: clearError } = await supabase
      .from("ai_scores")
      .delete()
      .eq("ai_review_id", saved.id);
    if (clearError) throw new Error(clearError.message);
    const { error: scoresError } = await supabase
      .from("ai_scores")
      .insert(values.map((v) => ({ ...v, ai_review_id: saved.id })));
    if (scoresError) throw new Error(scoresError.message);

    // What the AI read, for the organiser. Saved separately so grading still works
    // on a database that doesn't have the sources column yet.
    const { error: sourcesError } = await supabase
      .from("ai_reviews")
      .update({
        sources: [...materials.read, ...materials.unread.map((u) => `Not read: ${u}`)],
      })
      .eq("id", saved.id);
    if (sourcesError)
      console.warn("gradeSubmissionWithAi: sources not saved", sourcesError.message);

    return { status: "drafted", submissionId };
  });

/**
 * The organiser's decision on one AI result: save edits to a draft, approve it
 * (it then counts in the results), reject it, or move it back to draft.
 */
export const reviewAiResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      action: z.enum(["save", "approve", "reject", "reopen"]),
      feedback: z.string().max(10000).optional(),
      scores: z
        .array(z.object({ criterion_id: z.string().uuid(), value: z.number() }))
        .max(50)
        .optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrganiser(supabase, userId);

    const { data: review, error } = await supabase
      .from("ai_reviews")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!review) throw new Error("AI result not found.");
    if (review.status === "failed")
      throw new Error("This entry has no AI result yet. Run AI grading again.");

    // Edits (and approving with edits) only apply to results that aren't final yet.
    if ((data.feedback !== undefined || data.scores) && review.status === "approved") {
      throw new Error("Move this result back to draft before editing it.");
    }

    if (data.scores?.length) {
      const ids = data.scores.map((s) => s.criterion_id);
      const { data: crit, error: critError } = await supabase
        .from("criteria")
        .select("id, name, max_score")
        .in("id", ids);
      if (critError) throw new Error(critError.message);
      for (const s of data.scores) {
        const c = crit?.find((x) => x.id === s.criterion_id);
        if (!c) throw new Error("Unknown rubric criterion.");
        const max = c.max_score || 5;
        if (s.value < 0 || s.value > max || s.value * 2 !== Math.round(s.value * 2)) {
          throw new Error(`${c.name} must be between 0 and ${max}, in steps of 0.5.`);
        }
      }
      const { error: upsertError } = await supabase.from("ai_scores").upsert(
        data.scores.map((s) => ({
          ai_review_id: review.id,
          criterion_id: s.criterion_id,
          value: s.value,
        })),
        { onConflict: "ai_review_id,criterion_id" },
      );
      if (upsertError) throw new Error(upsertError.message);
    }

    const status =
      data.action === "approve"
        ? "approved"
        : data.action === "reject"
          ? "rejected"
          : data.action === "reopen"
            ? "draft"
            : review.status;
    const decided = data.action === "approve" || data.action === "reject";
    const { plainDashes } = await import("@/lib/ai-grading.server");
    const { error: updateError } = await supabase
      .from("ai_reviews")
      .update({
        status,
        ...(data.feedback !== undefined ? { feedback: plainDashes(data.feedback) } : {}),
        reviewed_by: decided ? userId : null,
        reviewed_at: decided ? new Date().toISOString() : null,
      })
      .eq("id", review.id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true as const, status };
  });
