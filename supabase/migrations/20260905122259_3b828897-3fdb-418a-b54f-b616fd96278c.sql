GRANT SELECT (id, submission_id, criterion_id, value) ON public.scores TO anon;

DROP POLICY IF EXISTS "Public can read score values for active events" ON public.scores;
CREATE POLICY "Public can read score values for active events"
ON public.scores
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.events e ON e.id = s.event_id
    WHERE s.id = scores.submission_id
      AND e.status = 'active'
  )
);