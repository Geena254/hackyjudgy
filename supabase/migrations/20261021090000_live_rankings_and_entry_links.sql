-- Per-hackathon settings, and a separate video demo link on entries.

-- Organisers choose whether the public sees live rankings while judging runs.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS show_live_rankings boolean NOT NULL DEFAULT true;
-- Link to the hackathon's concept note / brief.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS brief_url text;

-- demo_url stays the live prototype; video_url is the recorded demo.
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS video_url text;

GRANT INSERT (video_url) ON public.submissions TO anon;

-- Public RPCs now include the video link. The return type changes, so drop first.
DROP FUNCTION IF EXISTS public.public_submissions(uuid);
DROP FUNCTION IF EXISTS public.public_submission(uuid);

CREATE FUNCTION public.public_submissions(_event_id uuid)
RETURNS TABLE (
  id uuid, event_id uuid, round_id uuid, title text, team_name text, category text,
  description text, repo_url text, demo_url text, deck_url text, video_url text, status text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.event_id, s.round_id, s.title, s.team_name, s.category, s.description,
         s.repo_url, s.demo_url, s.deck_url, s.video_url, s.status, s.created_at
  FROM public.submissions s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.event_id = _event_id AND e.status = 'active'
  ORDER BY s.created_at DESC;
$$;

CREATE FUNCTION public.public_submission(_id uuid)
RETURNS TABLE (
  id uuid, event_id uuid, round_id uuid, title text, team_name text, category text,
  description text, repo_url text, demo_url text, deck_url text, video_url text, status text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.event_id, s.round_id, s.title, s.team_name, s.category, s.description,
         s.repo_url, s.demo_url, s.deck_url, s.video_url, s.status, s.created_at
  FROM public.submissions s
  JOIN public.events e ON e.id = s.event_id
  WHERE s.id = _id AND e.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.public_submissions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_submissions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submission(uuid) TO anon, authenticated;

-- With live rankings switched off, the public gets no scores at all, not just a hidden board.
CREATE OR REPLACE FUNCTION public.public_score_averages(_event_id uuid)
RETURNS TABLE (submission_id uuid, criterion_id uuid, avg_value numeric, judge_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sc.submission_id,
         sc.criterion_id,
         round(avg(sc.value)::numeric, 3) AS avg_value,
         count(*)::int AS judge_count
  FROM public.scores sc
  JOIN public.submissions su ON su.id = sc.submission_id
  JOIN public.events e ON e.id = su.event_id
  WHERE e.id = _event_id
    AND e.status = 'active'
    AND e.show_live_rankings
  GROUP BY sc.submission_id, sc.criterion_id;
$$;
