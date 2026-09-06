-- 1) Public standings read aggregated averages only; individual judge marks are no longer public.
DROP POLICY IF EXISTS "Public can read score values for active events" ON public.scores;
REVOKE ALL ON public.scores FROM anon;

CREATE OR REPLACE VIEW public.public_score_averages
WITH (security_invoker = false) AS
SELECT sc.submission_id,
       sc.criterion_id,
       round(avg(sc.value)::numeric, 3) AS avg_value,
       count(*)::int AS judge_count
FROM public.scores sc
JOIN public.submissions su ON su.id = sc.submission_id
JOIN public.events e ON e.id = su.event_id
WHERE e.status = 'active'
GROUP BY sc.submission_id, sc.criterion_id;

GRANT SELECT ON public.public_score_averages TO anon, authenticated;

-- 2) Entrant contact details are no longer readable by the public.
REVOKE ALL ON public.submissions FROM anon;
GRANT SELECT (id, event_id, round_id, title, team_name, category, description,
              repo_url, demo_url, deck_url, status, created_at, updated_at)
  ON public.submissions TO anon;
GRANT INSERT (event_id, round_id, title, team_name, category, description,
              submitter_name, submitter_email, repo_url, demo_url, deck_url)
  ON public.submissions TO anon;