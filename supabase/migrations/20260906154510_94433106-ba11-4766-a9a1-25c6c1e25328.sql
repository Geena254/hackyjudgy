DROP VIEW IF EXISTS public.public_score_averages;

CREATE OR REPLACE FUNCTION public.public_score_averages(_event_id uuid)
RETURNS TABLE (submission_id uuid, criterion_id uuid, avg_value numeric, judge_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.submission_id,
         sc.criterion_id,
         round(avg(sc.value)::numeric, 3) AS avg_value,
         count(*)::int AS judge_count
  FROM public.scores sc
  JOIN public.submissions su ON su.id = sc.submission_id
  JOIN public.events e ON e.id = su.event_id
  WHERE e.id = _event_id
    AND e.status = 'active'
  GROUP BY sc.submission_id, sc.criterion_id;
$$;

REVOKE ALL ON FUNCTION public.public_score_averages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_score_averages(uuid) TO anon, authenticated;