-- AI grading of entries, for organisers.
--
-- An organiser can have Claude score every entry against the hackathon's rubric
-- and write feedback for the team. Nothing counts straight away: each AI result
-- is saved as a draft, and the organiser edits it, then approves or rejects it.
-- Only approved results count, as one more judge alongside the panel, in the
-- results, team reports and the public standings. Judges never see AI results.

CREATE TABLE IF NOT EXISTS public.ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  -- draft: waiting for review · approved: counts in results · rejected: ignored
  -- failed: the last AI run for this entry did not finish (see error)
  status text NOT NULL DEFAULT 'draft',
  feedback text,
  error text,
  model text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_reviews_status_check CHECK (status IN ('draft', 'approved', 'rejected', 'failed'))
);
CREATE INDEX IF NOT EXISTS ai_reviews_event_idx ON public.ai_reviews (event_id);

-- The AI's mark for each rubric criterion, on the same scale as judges' scores.
CREATE TABLE IF NOT EXISTS public.ai_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_review_id uuid NOT NULL REFERENCES public.ai_reviews(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  value numeric(4,1) NOT NULL,
  UNIQUE (ai_review_id, criterion_id),
  CONSTRAINT ai_scores_value_check CHECK (value >= 0 AND value <= 10 AND value * 2 = round(value * 2))
);
CREATE INDEX IF NOT EXISTS ai_scores_criterion_idx ON public.ai_scores (criterion_id);

DROP TRIGGER IF EXISTS ai_reviews_updated_at ON public.ai_reviews;
CREATE TRIGGER ai_reviews_updated_at
  BEFORE UPDATE ON public.ai_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION private.ai_review_event(_ai_review_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT event_id FROM public.ai_reviews WHERE id = _ai_review_id;
$$;
REVOKE ALL ON FUNCTION private.ai_review_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.ai_review_event(uuid) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_scores TO authenticated;
GRANT ALL ON public.ai_reviews TO service_role;
GRANT ALL ON public.ai_scores TO service_role;
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scores ENABLE ROW LEVEL SECURITY;

-- Only the hackathon's organisers (and the platform admin) see or change AI results.
DROP POLICY IF EXISTS ai_reviews_organiser_manage ON public.ai_reviews;
CREATE POLICY ai_reviews_organiser_manage ON public.ai_reviews
  FOR ALL TO authenticated
  USING (private.can_manage_event(event_id))
  WITH CHECK (
    private.can_manage_event(event_id)
    AND private.submission_event(submission_id) = event_id
  );

DROP POLICY IF EXISTS ai_scores_organiser_manage ON public.ai_scores;
CREATE POLICY ai_scores_organiser_manage ON public.ai_scores
  FOR ALL TO authenticated
  USING (private.can_manage_event(private.ai_review_event(ai_review_id)))
  WITH CHECK (private.can_manage_event(private.ai_review_event(ai_review_id)));

-- The public board counts approved AI results as one more judge.
CREATE OR REPLACE FUNCTION public.public_score_averages(_event_id uuid)
RETURNS TABLE (submission_id uuid, criterion_id uuid, avg_value numeric, judge_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH marks AS (
    SELECT sc.submission_id, sc.criterion_id, sc.value
    FROM public.scores sc
    JOIN public.submissions su ON su.id = sc.submission_id
    WHERE su.event_id = _event_id
    UNION ALL
    SELECT r.submission_id, a.criterion_id, a.value
    FROM public.ai_scores a
    JOIN public.ai_reviews r ON r.id = a.ai_review_id
    WHERE r.event_id = _event_id AND r.status = 'approved'
  )
  SELECT m.submission_id,
         m.criterion_id,
         round(avg(m.value)::numeric, 3) AS avg_value,
         count(*)::int AS judge_count
  FROM marks m
  JOIN public.events e ON e.id = _event_id
  WHERE e.status = 'active'
    AND e.show_live_rankings
  GROUP BY m.submission_id, m.criterion_id;
$$;

ALTER FUNCTION public.public_score_averages(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_score_averages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_score_averages(uuid) TO anon, authenticated;
