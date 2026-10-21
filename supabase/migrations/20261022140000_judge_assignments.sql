-- Share out entries between judges.
--
-- With more than 10 entries, an organiser can share them out so each entry
-- goes to one judge and every judge gets an equal share (counts differ by at
-- most one). Once a hackathon is shared out, a judge only sees and scores the
-- entries given to them. Hackathons that aren't shared out work as before:
-- every judge on the panel scores every entry.

CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, judge_id)
);
CREATE INDEX IF NOT EXISTS judge_assignments_event_idx ON public.judge_assignments (event_id);
CREATE INDEX IF NOT EXISTS judge_assignments_judge_idx ON public.judge_assignments (judge_id);

GRANT SELECT ON public.judge_assignments TO authenticated;
GRANT ALL ON public.judge_assignments TO service_role;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

-- Judges see their own share; organisers see their hackathons' shares.
-- Changes only go through the functions below.
CREATE POLICY judge_assignments_read ON public.judge_assignments
  FOR SELECT TO authenticated
  USING (judge_id = auth.uid() OR private.can_manage_event(event_id));

/* -------------------------------- helpers -------------------------------- */

CREATE OR REPLACE FUNCTION private.event_is_shared_out(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.judge_assignments WHERE event_id = _event_id);
$$;

-- A judge can score an entry when they judge its hackathon and, if the
-- hackathon is shared out, the entry was given to them.
CREATE OR REPLACE FUNCTION private.can_judge_submission(_submission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.id = _submission_id
      AND private.can_judge_event(s.event_id)
      AND (
        NOT private.event_is_shared_out(s.event_id)
        OR EXISTS (
          SELECT 1 FROM public.judge_assignments a
          WHERE a.submission_id = s.id AND a.judge_id = auth.uid()
        )
      )
  );
$$;

-- Give one entry to the panel judge with the fewest entries so far.
CREATE OR REPLACE FUNCTION private.assign_submission(_submission_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _event uuid;
  _judge uuid;
BEGIN
  SELECT event_id INTO _event FROM public.submissions WHERE id = _submission_id;
  IF _event IS NULL
     OR EXISTS (SELECT 1 FROM public.judge_assignments WHERE submission_id = _submission_id) THEN
    RETURN;
  END IF;

  SELECT r.user_id INTO _judge
  FROM public.user_roles r
  LEFT JOIN public.judge_assignments a ON a.judge_id = r.user_id AND a.event_id = _event
  WHERE r.role = 'judge' AND private.user_can_judge_event(r.user_id, _event)
  GROUP BY r.user_id
  ORDER BY count(a.id), random()
  LIMIT 1;

  IF _judge IS NOT NULL THEN
    INSERT INTO public.judge_assignments (event_id, submission_id, judge_id)
    VALUES (_event, _submission_id, _judge)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.event_is_shared_out(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_judge_submission(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.assign_submission(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.event_is_shared_out(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_judge_submission(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.assign_submission(uuid) TO service_role;

/* -------------------------------- policies ------------------------------- */

DROP POLICY IF EXISTS submissions_staff_read ON public.submissions;
CREATE POLICY submissions_staff_read ON public.submissions
  FOR SELECT TO authenticated
  USING (private.can_manage_event(event_id) OR private.can_judge_submission(id));

DROP POLICY IF EXISTS scores_judge_manage ON public.scores;
CREATE POLICY scores_judge_manage ON public.scores
  FOR ALL TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (judge_id = auth.uid() AND private.can_judge_submission(submission_id));

DROP POLICY IF EXISTS reviews_judge_manage ON public.reviews;
CREATE POLICY reviews_judge_manage ON public.reviews
  FOR ALL TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (judge_id = auth.uid() AND private.can_judge_submission(submission_id));

/* ------------------------------ organiser actions ------------------------ */

-- Share out (or rebalance) a hackathon's entries. Entries a judge has already
-- started scoring stay with them; everything else is shared out again evenly.
CREATE OR REPLACE FUNCTION public.share_out_entries(_event_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _entries integer;
  _judges integer;
  _sub record;
  _done integer := 0;
BEGIN
  IF NOT private.can_manage_event(_event_id) THEN
    RAISE EXCEPTION 'Only this hackathon''s organisers can share out its entries.';
  END IF;

  SELECT count(*) INTO _entries
  FROM public.submissions WHERE event_id = _event_id AND status <> 'disqualified';
  IF _entries <= 10 THEN
    RAISE EXCEPTION 'Sharing out is for hackathons with more than 10 entries. With % entries, every judge scores every entry.', _entries;
  END IF;

  SELECT count(*) INTO _judges
  FROM public.user_roles r
  WHERE r.role = 'judge' AND private.user_can_judge_event(r.user_id, _event_id);
  IF _judges = 0 THEN
    RAISE EXCEPTION 'Invite judges to this hackathon before sharing out its entries.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('share_out:' || _event_id::text));

  -- Release shares nobody has started, and shares held by judges no longer on the panel.
  DELETE FROM public.judge_assignments a
  WHERE a.event_id = _event_id
    AND NOT EXISTS (
      SELECT 1 FROM public.scores s
      WHERE s.submission_id = a.submission_id AND s.judge_id = a.judge_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews v
      WHERE v.submission_id = a.submission_id AND v.judge_id = a.judge_id
    );

  FOR _sub IN
    SELECT s.id FROM public.submissions s
    WHERE s.event_id = _event_id
      AND s.status <> 'disqualified'
      AND NOT EXISTS (SELECT 1 FROM public.judge_assignments a WHERE a.submission_id = s.id)
    ORDER BY s.created_at
  LOOP
    PERFORM private.assign_submission(_sub.id);
    _done := _done + 1;
  END LOOP;

  RETURN _done;
END;
$$;

-- Go back to every judge scoring every entry. Scores already given are kept.
CREATE OR REPLACE FUNCTION public.undo_share_out(_event_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.can_manage_event(_event_id) THEN
    RAISE EXCEPTION 'Only this hackathon''s organisers can change how entries are shared out.';
  END IF;
  DELETE FROM public.judge_assignments WHERE event_id = _event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.share_out_entries(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_share_out(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_out_entries(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_share_out(uuid) TO authenticated;

/* --------------------------- new entries after sharing ------------------- */

-- Once a hackathon is shared out, each new entry goes straight to the judge
-- with the fewest entries.
CREATE OR REPLACE FUNCTION private.assign_new_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF private.event_is_shared_out(NEW.event_id) THEN
    PERFORM private.assign_submission(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_assign_new ON public.submissions;
CREATE TRIGGER submissions_assign_new
  AFTER INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION private.assign_new_submission();
