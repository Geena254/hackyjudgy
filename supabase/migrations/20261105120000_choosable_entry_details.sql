-- Organisers now choose every field on the entry form, including the entrant's
-- name, team name, teammates' emails, project name and description. Email stays
-- on every form, since it is how entries are told apart.
--
-- New "Who submits" option, entrants = 'each_member': every team member fills in
-- their own form and lists their teammates. Each email can still submit only
-- once, but a teammate listed on someone else's form can submit their own.
--
-- An entry without a project name is named after its team, then its entrant.

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
  _team_member_emails text[] DEFAULT '{}',
  _concept_note_url text DEFAULT NULL,
  _answers jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
  _lead text := lower(trim(coalesce(_submitter_email, '')));
  _mates text[];
  _taken text;
  _manager boolean := auth.uid() IS NOT NULL AND private.can_manage_event(_event_id);
  _form jsonb;
  _entrants text;
  _field jsonb;
  _value text;
  _clean jsonb := '{}'::jsonb;
  _name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id) THEN
    RAISE EXCEPTION 'Hackathon not found.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND status = 'active')
     AND NOT _manager THEN
    RAISE EXCEPTION 'This hackathon is not open for entries.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND submissions_close_at <= now())
     AND NOT _manager THEN
    RAISE EXCEPTION 'The submission period for this hackathon has closed.';
  END IF;
  IF _round_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.rounds WHERE id = _round_id AND event_id = _event_id) THEN
    RAISE EXCEPTION 'That round does not belong to this hackathon.';
  END IF;
  IF _lead = '' THEN
    RAISE EXCEPTION 'Please include your email.';
  END IF;

  SELECT submission_form INTO _form FROM public.events WHERE id = _event_id;
  _entrants := coalesce(_form ->> 'entrants', 'either');

  _name := coalesce(
    nullif(trim(_title), ''),
    nullif(trim(_team_name), ''),
    nullif(trim(_submitter_name), ''),
    _lead
  );
  IF length(_name) > 200 THEN
    RAISE EXCEPTION 'Please keep the project name under 200 characters.';
  END IF;
  IF _form IS NULL AND coalesce(trim(_title), '') = '' THEN
    RAISE EXCEPTION 'Please give your project a title (up to 200 characters).';
  END IF;
  IF length(coalesce(_description, '')) > 10000 THEN
    RAISE EXCEPTION 'Please keep the description under 10,000 characters.';
  END IF;

  SELECT coalesce(array_agg(DISTINCT m), '{}') INTO _mates
  FROM (
    SELECT lower(trim(x)) AS m FROM unnest(coalesce(_team_member_emails, '{}')) AS x
  ) t
  WHERE m <> '';
  IF _entrants = 'each_member' THEN
    -- Every teammate lists the same team, so listing yourself is fine.
    _mates := array_remove(_mates, _lead);
  ELSIF _lead = ANY (_mates) THEN
    RAISE EXCEPTION 'Your own email is already the team lead''s, so list only your teammates.';
  END IF;
  IF cardinality(_mates) > 20 THEN
    RAISE EXCEPTION 'A team can list at most 20 teammates.';
  END IF;

  -- Keep only answers to the hackathon's own questions.
  IF _form IS NOT NULL AND jsonb_typeof(_form -> 'fields') = 'array' THEN
    FOR _field IN SELECT * FROM jsonb_array_elements(_form -> 'fields') LOOP
      IF _field ->> 'kind' IN ('text', 'long_text', 'link') THEN
        _value := trim(coalesce(_answers ->> (_field ->> 'id'), ''));
        IF length(_value) > 5000 THEN
          RAISE EXCEPTION 'Please keep "%" under 5,000 characters.', _field ->> 'label';
        END IF;
        IF _value <> '' THEN
          _clean := _clean || jsonb_build_object(_field ->> 'id', _value);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- The hackathon's required fields and who may enter (organisers may skip these).
  IF NOT _manager THEN
    IF _form IS NULL THEN
      IF coalesce(trim(_repo_url), '') = '' OR coalesce(trim(_demo_url), '') = ''
         OR coalesce(trim(_deck_url), '') = '' OR coalesce(trim(_video_url), '') = '' THEN
        RAISE EXCEPTION 'Please add all four project links.';
      END IF;
    ELSE
      IF _entrants = 'individual' AND cardinality(_mates) > 0 THEN
        RAISE EXCEPTION 'This hackathon is for individual entries, so teammates can''t be added.';
      END IF;
      FOR _field IN SELECT * FROM jsonb_array_elements(coalesce(_form -> 'fields', '[]'::jsonb)) LOOP
        CONTINUE WHEN coalesce((_field ->> 'required')::boolean, false) = false;
        -- Team fields aren't asked of individual entries.
        CONTINUE WHEN _field ->> 'kind' IN ('team_name', 'team_member_emails')
          AND (_entrants = 'individual'
               OR (_entrants = 'either' AND cardinality(_mates) = 0
                   AND coalesce(trim(_team_name), '') = ''));
        IF _field ->> 'kind' = 'team_member_emails' THEN
          IF cardinality(_mates) = 0 THEN
            RAISE EXCEPTION 'Please fill in "%".', _field ->> 'label';
          END IF;
          CONTINUE;
        END IF;
        _value := CASE _field ->> 'kind'
          WHEN 'title' THEN _title
          WHEN 'description' THEN _description
          WHEN 'submitter_name' THEN _submitter_name
          WHEN 'submitter_email' THEN _lead
          WHEN 'team_name' THEN _team_name
          WHEN 'category' THEN _category
          WHEN 'concept_note_url' THEN _concept_note_url
          WHEN 'video_url' THEN _video_url
          WHEN 'deck_url' THEN _deck_url
          WHEN 'demo_url' THEN _demo_url
          WHEN 'repo_url' THEN _repo_url
          ELSE _clean ->> (_field ->> 'id')
        END;
        IF coalesce(trim(_value), '') = '' THEN
          RAISE EXCEPTION 'Please fill in "%".', _field ->> 'label';
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Take entries for this hackathon one at a time.
  PERFORM pg_advisory_xact_lock(hashtext('submit_entry:' || _event_id::text));

  IF _entrants = 'each_member' THEN
    -- Each person submits once; teammates listed on other forms still submit their own.
    SELECT s.submitter_email INTO _taken
    FROM public.submissions s
    WHERE s.event_id = _event_id AND lower(s.submitter_email) = _lead
    LIMIT 1;
    IF _taken IS NOT NULL THEN
      RAISE EXCEPTION '% has already submitted to this hackathon. Each person can only submit once.',
        lower(_taken);
    END IF;
  ELSE
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
  END IF;

  INSERT INTO public.submissions (
    event_id, round_id, title, team_name, category, description,
    submitter_name, submitter_email, repo_url, demo_url, deck_url, video_url,
    concept_note_url, team_member_emails, answers, status
  ) VALUES (
    _event_id, _round_id, _name, nullif(trim(_team_name), ''), nullif(trim(_category), ''),
    _description, nullif(trim(_submitter_name), ''), _lead,
    nullif(trim(_repo_url), ''), nullif(trim(_demo_url), ''), nullif(trim(_deck_url), ''),
    nullif(trim(_video_url), ''), nullif(trim(_concept_note_url), ''), _mates, _clean, 'submitted'
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_entry(
  uuid, text, text, text, text, uuid, text, text, text, text, text, text, text[], text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_entry(
  uuid, text, text, text, text, uuid, text, text, text, text, text, text, text[], text, jsonb
) TO anon, authenticated;
