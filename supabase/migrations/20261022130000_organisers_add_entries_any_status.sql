-- Organisers and admins add entries through the same submit_entry() function as
-- participants, so the one-entry-per-email rule applies to them too. Unlike the
-- public, they may add entries to a hackathon they manage even while it's a
-- draft or closed.

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
  _lead text := lower(trim(coalesce(_submitter_email, '')));
  _mates text[];
  _taken text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id) THEN
    RAISE EXCEPTION 'Hackathon not found.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND status = 'active')
     AND NOT (auth.uid() IS NOT NULL AND private.can_manage_event(_event_id)) THEN
    RAISE EXCEPTION 'This hackathon is not open for entries.';
  END IF;
  IF _round_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.rounds WHERE id = _round_id AND event_id = _event_id) THEN
    RAISE EXCEPTION 'That round does not belong to this hackathon.';
  END IF;
  IF coalesce(trim(_title), '') = '' OR length(_title) > 200 THEN
    RAISE EXCEPTION 'Please give your project a title (up to 200 characters).';
  END IF;
  IF _lead = '' THEN
    RAISE EXCEPTION 'Please include your email.';
  END IF;
  IF length(coalesce(_description, '')) > 10000 THEN
    RAISE EXCEPTION 'Please keep the description under 10,000 characters.';
  END IF;

  SELECT coalesce(array_agg(DISTINCT m), '{}') INTO _mates
  FROM (
    SELECT lower(trim(x)) AS m FROM unnest(coalesce(_team_member_emails, '{}')) AS x
  ) t
  WHERE m <> '';
  IF cardinality(_mates) > 20 THEN
    RAISE EXCEPTION 'A team can list at most 20 teammates.';
  END IF;
  IF _lead = ANY (_mates) THEN
    RAISE EXCEPTION 'Your own email is already the team lead''s, so list only your teammates.';
  END IF;

  -- Take entries for this hackathon one at a time.
  PERFORM pg_advisory_xact_lock(hashtext('submit_entry:' || _event_id::text));

  SELECT e INTO _taken
  FROM public.submissions s,
       LATERAL unnest(array_append(s.team_member_emails, s.submitter_email)) AS e
  WHERE s.event_id = _event_id
    AND e IS NOT NULL
    AND lower(e) = ANY (array_append(_mates, _lead))
  LIMIT 1;
  IF _taken IS NOT NULL THEN
    RAISE EXCEPTION '% has already been used to submit to this hackathon. Each person can only be on one entry.',
      lower(_taken);
  END IF;

  INSERT INTO public.submissions (
    event_id, round_id, title, team_name, category, description,
    submitter_name, submitter_email, repo_url, demo_url, deck_url, video_url,
    team_member_emails, status
  ) VALUES (
    _event_id, _round_id, trim(_title), nullif(trim(_team_name), ''), nullif(trim(_category), ''),
    _description, nullif(trim(_submitter_name), ''), _lead,
    nullif(trim(_repo_url), ''), nullif(trim(_demo_url), ''), nullif(trim(_deck_url), ''),
    nullif(trim(_video_url), ''), _mates, 'submitted'
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;
