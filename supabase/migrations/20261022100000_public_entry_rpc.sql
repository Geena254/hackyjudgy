-- Fix the public hackathon page for signed-out visitors.
--
-- 1. Live standings: anon could not execute public_score_averages (401).
-- 2. Entry form: inserting straight into submissions failed for anon, because
--    the insert sets status (not in anon's column grant) and asks for the new
--    id back (anon may not read submissions). Entries now go through
--    submit_entry(), which checks the hackathon is open and returns the id.

-- Safe if 20261022090000 has already run.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS team_member_emails text[] NOT NULL DEFAULT '{}';

GRANT EXECUTE ON FUNCTION public.public_score_averages(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_entry(
  _event_id uuid,
  _title text,
  _description text,
  _submitter_name text,
  _submitter_email text,
  _round_id uuid DEFAULT NULL,
  _team_name text DEFAULT NULL,
  _category text DEFAULT NULL,
  _repo_url text DEFAULT NULL,
  _demo_url text DEFAULT NULL,
  _deck_url text DEFAULT NULL,
  _video_url text DEFAULT NULL,
  _team_member_emails text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND status = 'active') THEN
    RAISE EXCEPTION 'This hackathon is not open for entries.';
  END IF;
  IF _round_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.rounds WHERE id = _round_id AND event_id = _event_id) THEN
    RAISE EXCEPTION 'That round does not belong to this hackathon.';
  END IF;
  IF coalesce(trim(_title), '') = '' OR length(_title) > 200 THEN
    RAISE EXCEPTION 'Please give your project a title (up to 200 characters).';
  END IF;
  IF coalesce(trim(_submitter_email), '') = '' THEN
    RAISE EXCEPTION 'Please include your email.';
  END IF;
  IF length(coalesce(_description, '')) > 10000 THEN
    RAISE EXCEPTION 'Please keep the description under 10,000 characters.';
  END IF;
  IF cardinality(coalesce(_team_member_emails, '{}')) > 20 THEN
    RAISE EXCEPTION 'A team can list at most 20 teammates.';
  END IF;

  INSERT INTO public.submissions (
    event_id, round_id, title, team_name, category, description,
    submitter_name, submitter_email, repo_url, demo_url, deck_url, video_url,
    team_member_emails, status
  ) VALUES (
    _event_id, _round_id, trim(_title), nullif(trim(_team_name), ''), nullif(trim(_category), ''),
    _description, nullif(trim(_submitter_name), ''), lower(trim(_submitter_email)),
    nullif(trim(_repo_url), ''), nullif(trim(_demo_url), ''), nullif(trim(_deck_url), ''),
    nullif(trim(_video_url), ''), coalesce(_team_member_emails, '{}'), 'submitted'
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_entry(
  uuid, text, text, text, text, uuid, text, text, text, text, text, text, text[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_entry(
  uuid, text, text, text, text, uuid, text, text, text, text, text, text, text[]
) TO anon, authenticated;
