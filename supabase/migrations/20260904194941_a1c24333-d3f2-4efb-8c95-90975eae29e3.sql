GRANT SELECT (id, event_id, round_id, title, team_name, category, description, repo_url, demo_url, deck_url, status, created_at) ON public.submissions TO anon;

DROP POLICY IF EXISTS submissions_public_showcase ON public.submissions;
CREATE POLICY submissions_public_showcase ON public.submissions
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = submissions.event_id AND e.status = 'active'));