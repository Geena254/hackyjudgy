-- Organiser workspaces.
--
-- * admin     — the platform owner (PLP). Sees and manages every hackathon.
-- * organiser — anyone who signs up without an invitation. Sees and manages only
--               the hackathons they created, and the judges they invited.
-- * judge     — invited by an admin or organiser. Judges the hackathons of
--               whoever invited them.
--
-- A hackathon belongs to events.created_by. Hackathons created by an admin (or
-- with no creator) are "platform" hackathons, judged by admin-invited judges.

-- New hackathons belong to whoever creates them.
ALTER TABLE public.events ALTER COLUMN created_by SET DEFAULT auth.uid();

-- The same judge can now be invited by more than one organiser.
ALTER TABLE public.judge_invitations DROP CONSTRAINT IF EXISTS judge_invitations_email_key;
ALTER TABLE public.judge_invitations
  ADD CONSTRAINT judge_invitations_email_invited_by_key UNIQUE (email, invited_by);
CREATE INDEX IF NOT EXISTS judge_invitations_email_idx ON public.judge_invitations (lower(email));
CREATE INDEX IF NOT EXISTS events_created_by_idx ON public.events (created_by);

/* -------------------------------- helpers -------------------------------- */

-- Platform users are admins; a missing user (deleted, or seeded data) counts as platform.
CREATE OR REPLACE FUNCTION private.is_platform_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NULL OR private.has_role(_user_id, 'admin');
$$;

-- Who invited a user to judge (live invitations only).
CREATE OR REPLACE FUNCTION private.inviters_of(_user_id uuid)
RETURNS TABLE (invited_by uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.invited_by
  FROM public.judge_invitations i
  JOIN auth.users u ON lower(u.email) = lower(i.email)
  WHERE u.id = _user_id AND i.status IN ('pending', 'accepted');
$$;

CREATE OR REPLACE FUNCTION private.can_manage_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(auth.uid(), 'admin')
    OR (
      private.has_role(auth.uid(), 'organiser')
      AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.created_by = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION private.user_can_judge_event(_user_id uuid, _event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(_user_id, 'judge')
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = _event_id
        AND (
          EXISTS (
            SELECT 1 FROM private.inviters_of(_user_id) m
            WHERE m.invited_by = e.created_by
               OR (private.is_platform_user(m.invited_by) AND private.is_platform_user(e.created_by))
          )
          -- Judges added before invitations were tracked keep judging platform hackathons.
          OR (
            NOT EXISTS (SELECT 1 FROM private.inviters_of(_user_id))
            AND private.is_platform_user(e.created_by)
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_judge_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.user_can_judge_event(auth.uid(), _event_id);
$$;

CREATE OR REPLACE FUNCTION private.can_view_event(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.status = 'active')
    OR private.can_manage_event(_event_id)
    OR private.can_judge_event(_event_id);
$$;

CREATE OR REPLACE FUNCTION private.round_event(_round_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT event_id FROM public.rounds WHERE id = _round_id;
$$;

CREATE OR REPLACE FUNCTION private.submission_event(_submission_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT event_id FROM public.submissions WHERE id = _submission_id;
$$;

-- True when the signed-in organiser has a live invitation out to this user.
CREATE OR REPLACE FUNCTION private.invited_by_me(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.judge_invitations i
    JOIN auth.users u ON lower(u.email) = lower(i.email)
    WHERE u.id = _user_id AND i.invited_by = auth.uid() AND i.status IN ('pending', 'accepted')
  );
$$;

REVOKE ALL ON FUNCTION private.is_platform_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.inviters_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.user_can_judge_event(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_judge_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_view_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.round_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.submission_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.invited_by_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_platform_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.inviters_of(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.user_can_judge_event(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.can_manage_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_judge_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.round_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submission_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.invited_by_me(uuid) TO authenticated, service_role;

/* -------------------------------- policies ------------------------------- */

-- events
DROP POLICY IF EXISTS events_auth_read ON public.events;
CREATE POLICY events_auth_read ON public.events
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR private.can_manage_event(id)
    OR (status <> 'draft' AND private.can_judge_event(id))
  );
DROP POLICY IF EXISTS events_admin_write ON public.events;
CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    OR (private.has_role(auth.uid(), 'organiser') AND created_by = auth.uid())
  );
CREATE POLICY events_update ON public.events
  FOR UPDATE TO authenticated
  USING (private.can_manage_event(id))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
CREATE POLICY events_delete ON public.events
  FOR DELETE TO authenticated
  USING (private.can_manage_event(id));

-- rounds
DROP POLICY IF EXISTS rounds_auth_read ON public.rounds;
CREATE POLICY rounds_auth_read ON public.rounds
  FOR SELECT TO authenticated USING (private.can_view_event(event_id));
DROP POLICY IF EXISTS rounds_admin_write ON public.rounds;
CREATE POLICY rounds_manage ON public.rounds
  FOR ALL TO authenticated
  USING (private.can_manage_event(event_id))
  WITH CHECK (private.can_manage_event(event_id));

-- criteria
DROP POLICY IF EXISTS criteria_auth_read ON public.criteria;
CREATE POLICY criteria_auth_read ON public.criteria
  FOR SELECT TO authenticated USING (private.can_view_event(private.round_event(round_id)));
DROP POLICY IF EXISTS criteria_admin_write ON public.criteria;
CREATE POLICY criteria_manage ON public.criteria
  FOR ALL TO authenticated
  USING (private.can_manage_event(private.round_event(round_id)))
  WITH CHECK (private.can_manage_event(private.round_event(round_id)));

-- submissions (the public entry form keeps submissions_public_insert)
DROP POLICY IF EXISTS submissions_admin_judge_read ON public.submissions;
CREATE POLICY submissions_staff_read ON public.submissions
  FOR SELECT TO authenticated
  USING (private.can_manage_event(event_id) OR private.can_judge_event(event_id));
DROP POLICY IF EXISTS submissions_admin_write ON public.submissions;
CREATE POLICY submissions_manage ON public.submissions
  FOR ALL TO authenticated
  USING (private.can_manage_event(event_id))
  WITH CHECK (private.can_manage_event(event_id));

-- scores and reviews: judges write their own, for hackathons they judge
DROP POLICY IF EXISTS scores_judge_manage ON public.scores;
CREATE POLICY scores_judge_manage ON public.scores
  FOR ALL TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (
    judge_id = auth.uid() AND private.can_judge_event(private.submission_event(submission_id))
  );
DROP POLICY IF EXISTS scores_admin_read ON public.scores;
CREATE POLICY scores_organiser_read ON public.scores
  FOR SELECT TO authenticated
  USING (private.can_manage_event(private.submission_event(submission_id)));

DROP POLICY IF EXISTS reviews_judge_manage ON public.reviews;
CREATE POLICY reviews_judge_manage ON public.reviews
  FOR ALL TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (
    judge_id = auth.uid() AND private.can_judge_event(private.submission_event(submission_id))
  );
DROP POLICY IF EXISTS reviews_admin_read ON public.reviews;
CREATE POLICY reviews_organiser_read ON public.reviews
  FOR SELECT TO authenticated
  USING (private.can_manage_event(private.submission_event(submission_id)));

-- judge invitations: organisers manage their own
CREATE POLICY invites_organiser_own ON public.judge_invitations
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'organiser') AND invited_by = auth.uid())
  WITH CHECK (private.has_role(auth.uid(), 'organiser') AND invited_by = auth.uid());

-- organisers can see the judges they invited
CREATE POLICY user_roles_organiser_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (role = 'judge' AND private.invited_by_me(user_id));
CREATE POLICY profiles_organiser_read ON public.profiles
  FOR SELECT TO authenticated
  USING (private.invited_by_me(id));

/* ------------------------------ workspace list ---------------------------- */

-- The hackathons a signed-in user works on: everything for admins, their own
-- for organisers, the published or closed ones they judge for judges. Unlike a
-- plain select on events, this leaves out other organisers' live hackathons.
CREATE OR REPLACE FUNCTION public.workspace_events()
RETURNS SETOF public.events
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM public.events e
  WHERE private.can_manage_event(e.id)
     OR (e.status <> 'draft' AND private.can_judge_event(e.id))
  ORDER BY e.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.workspace_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_events() TO authenticated;

-- The judging panel of one hackathon, for its organiser (or a platform admin).
CREATE OR REPLACE FUNCTION public.event_judges(_event_id uuid)
RETURNS TABLE (id uuid, full_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.user_roles r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.role = 'judge'
    AND private.can_manage_event(_event_id)
    AND private.user_can_judge_event(r.user_id, _event_id);
$$;
REVOKE ALL ON FUNCTION public.event_judges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_judges(uuid) TO authenticated;

/* -------------------------------- sign-up -------------------------------- */

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_first boolean;
  _invited boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO _is_first;

  UPDATE public.judge_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE lower(email) = lower(NEW.email) AND status = 'pending';

  SELECT EXISTS (
    SELECT 1 FROM public.judge_invitations
    WHERE lower(email) = lower(NEW.email) AND status IN ('pending', 'accepted')
  ) INTO _invited;

  IF _invited THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'judge')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Anyone else signing up is an organiser running their own hackathons.
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'organiser')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Accounts that signed up before organisers existed were left with no role.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'organiser'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;
