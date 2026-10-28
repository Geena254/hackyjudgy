-- AI grading is a fallback for entries the panel hasn't covered. An approved AI
-- result counts as one more judge only while at most 2 judges have finished
-- scoring the entry; with 3 or more, the judges' scores stand on their own.
-- (Same rule as AI_FALLBACK_MAX_JUDGES in src/lib/hackathon.ts.)
--
-- A judge has finished an entry once they have scored as many criteria as the
-- AI did, since the AI always scores the entry's whole rubric.
CREATE OR REPLACE FUNCTION public.public_score_averages(_event_id uuid)
RETURNS TABLE (submission_id uuid, criterion_id uuid, avg_value numeric, judge_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH judge_marks AS (
    SELECT sc.submission_id, sc.criterion_id, sc.judge_id, sc.value
    FROM public.scores sc
    JOIN public.submissions su ON su.id = sc.submission_id
    WHERE su.event_id = _event_id
  ),
  ai AS (
    SELECT r.id, r.submission_id, count(a.id) AS criteria_scored
    FROM public.ai_reviews r
    JOIN public.ai_scores a ON a.ai_review_id = r.id
    WHERE r.event_id = _event_id AND r.status = 'approved'
    GROUP BY r.id, r.submission_id
  ),
  ai_counted AS (
    SELECT ai.id
    FROM ai
    WHERE (
      SELECT count(*)
      FROM (
        SELECT jm.judge_id
        FROM judge_marks jm
        WHERE jm.submission_id = ai.submission_id
        GROUP BY jm.judge_id
        HAVING count(DISTINCT jm.criterion_id) >= ai.criteria_scored
      ) finished
    ) <= 2
  ),
  marks AS (
    SELECT jm.submission_id, jm.criterion_id, jm.value FROM judge_marks jm
    UNION ALL
    SELECT r.submission_id, a.criterion_id, a.value
    FROM public.ai_scores a
    JOIN public.ai_reviews r ON r.id = a.ai_review_id
    WHERE r.id IN (SELECT id FROM ai_counted)
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
