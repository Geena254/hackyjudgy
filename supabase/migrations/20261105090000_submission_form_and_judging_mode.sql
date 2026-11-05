-- Each hackathon chooses what entrants submit and how entries are judged.
--
-- events.submission_form: which fields the entry form asks for, their labels and
--   whether each is required, plus whether teams, individuals or both may enter.
--   NULL keeps the original form (category plus four required links).
-- events.judging_mode: 1 judge + AI, 1 judge, AI only, 2+ judges, or AI + 2+ judges.
--   Approved AI results count as one more judge only in the modes that use AI.
-- submissions.answers: entrants' answers to the organiser's own questions,
--   keyed by field id (built-in fields keep their own columns).

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS submission_form jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS judging_mode text NOT NULL DEFAULT 'panel_ai';
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_judging_mode_check;
ALTER TABLE public.events ADD CONSTRAINT events_judging_mode_check
  CHECK (judging_mode IN ('judge_ai', 'judge', 'ai', 'panel', 'panel_ai'));

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- The entry function now takes the documentation link and custom answers, and
-- checks the hackathon's own required fields. Organisers adding or editing
-- entries for hackathons they manage may leave fields empty.
DROP FUNCTION IF EXISTS public.submit_entry(
  uuid, text, text, text, text, uuid, text, text, text, text, text, text, text[]
);

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
  _field jsonb;
  _value text;
  _clean jsonb := '{}'::jsonb;
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

  SELECT submission_form INTO _form FROM public.events WHERE id = _event_id;

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
      IF _form ->> 'entrants' = 'team' AND cardinality(_mates) = 0 THEN
        RAISE EXCEPTION 'This hackathon is for teams. Please add your teammates'' emails.';
      END IF;
      IF _form ->> 'entrants' = 'individual' AND cardinality(_mates) > 0 THEN
        RAISE EXCEPTION 'This hackathon is for individual entries, so teammates can''t be added.';
      END IF;
      FOR _field IN SELECT * FROM jsonb_array_elements(coalesce(_form -> 'fields', '[]'::jsonb)) LOOP
        CONTINUE WHEN coalesce((_field ->> 'required')::boolean, false) = false;
        _value := CASE _field ->> 'kind'
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
    concept_note_url, team_member_emails, answers, status
  ) VALUES (
    _event_id, _round_id, trim(_title), nullif(trim(_team_name), ''), nullif(trim(_category), ''),
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

-- The public board counts approved AI results as one more judge, but only for
-- hackathons whose judging mode uses AI. (Same rule as aiJudgeMarks in src/lib/hackathon.ts.)
CREATE OR REPLACE FUNCTION public.public_score_averages(_event_id uuid)
RETURNS TABLE (submission_id uuid, criterion_id uuid, avg_value numeric, judge_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH marks AS (
    SELECT sc.submission_id, sc.criterion_id, sc.value
    FROM public.scores sc
    JOIN public.submissions su ON su.id = sc.submission_id
    WHERE su.event_id = _event_id
    UNION ALL
    SELECT r.submission_id, a.criterion_id, a.value
    FROM public.ai_scores a
    JOIN public.ai_reviews r ON r.id = a.ai_review_id
    JOIN public.events ev ON ev.id = r.event_id
    WHERE r.event_id = _event_id
      AND r.status = 'approved'
      AND ev.judging_mode IN ('judge_ai', 'ai', 'panel_ai')
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
