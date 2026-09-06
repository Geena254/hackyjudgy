DROP POLICY IF EXISTS "submissions_public_showcase" ON public.submissions;
REVOKE SELECT ON public.submissions FROM anon;

CREATE OR REPLACE FUNCTION public.public_submissions(_event_id uuid)
RETURNS TABLE (
  id uuid, event_id uuid, round_id uuid, title text, team_name text, category text,
  description text, repo_url text, demo_url text, deck_url text, status text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.event_id, s.round_id, s.title, s.team_name, s.category, s.description,
         s.repo_url, s.demo_url, s.deck_url, s.status, s.created_at
  FROM public.submissions s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.event_id = _event_id AND e.status = 'active'
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.public_submission(_id uuid)
RETURNS TABLE (
  id uuid, event_id uuid, round_id uuid, title text, team_name text, category text,
  description text, repo_url text, demo_url text, deck_url text, status text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.event_id, s.round_id, s.title, s.team_name, s.category, s.description,
         s.repo_url, s.demo_url, s.deck_url, s.status, s.created_at
  FROM public.submissions s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.id = _id AND e.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.public_submissions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_submissions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submission(uuid) TO anon, authenticated;