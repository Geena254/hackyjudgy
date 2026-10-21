-- Judges are invited per hackathon.
--
-- An invitation now names the hackathon (event_id), and a judge scores exactly
-- the hackathons they've been invited to. Someone already on the platform who
-- is invited to another hackathon keeps their account and can start judging
-- it straight away.

ALTER TABLE public.judge_invitations
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.judge_invitations DROP CONSTRAINT IF EXISTS judge_invitations_email_invited_by_key;
ALTER TABLE public.judge_invitations DROP CONSTRAINT IF EXISTS judge_invitations_email_key;

-- Existing invitations had no hackathon. Give each judge the hackathons they
-- could judge before this change (their inviter's, created before today), so
-- nobody loses access and nobody is added to newer hackathons uninvited.
INSERT INTO public.judge_invitations
  (email, full_name, expertise, status, invited_by, created_at, accepted_at, event_id)
SELECT i.email, i.full_name, i.expertise, i.status, i.invited_by, i.created_at, i.accepted_at, e.id
FROM public.judge_invitations i
JOIN public.events e
  ON e.created_at < '2026-10-21'
 AND (
   i.invited_by = e.created_by
   OR (private.is_platform_user(i.invited_by) AND private.is_platform_user(e.created_by))
 )
WHERE i.event_id IS NULL;

DELETE FROM public.judge_invitations WHERE event_id IS NULL;

ALTER TABLE public.judge_invitations
  ADD CONSTRAINT judge_invitations_email_event_key UNIQUE (email, event_id);
CREATE INDEX IF NOT EXISTS judge_invitations_event_idx ON public.judge_invitations (event_id);

-- A judge can judge a hackathon when they hold a live invitation to it.
CREATE OR REPLACE FUNCTION private.user_can_judge_event(_user_id uuid, _event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.has_role(_user_id, 'judge')
    AND EXISTS (
      SELECT 1
      FROM public.judge_invitations i
      JOIN auth.users u ON lower(u.email) = lower(i.email)
      WHERE u.id = _user_id
        AND i.event_id = _event_id
        AND i.status IN ('pending', 'accepted')
    );
$$;

DROP FUNCTION IF EXISTS private.inviters_of(uuid);

-- True when this user is a judge on one of the signed-in organiser's hackathons.
CREATE OR REPLACE FUNCTION private.invited_by_me(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.judge_invitations i
    JOIN auth.users u ON lower(u.email) = lower(i.email)
    WHERE u.id = _user_id
      AND i.status IN ('pending', 'accepted')
      AND private.can_manage_event(i.event_id)
  );
$$;

-- Organisers manage the invitations for the hackathons they run.
DROP POLICY IF EXISTS invites_organiser_own ON public.judge_invitations;
CREATE POLICY invites_event_manage ON public.judge_invitations
  FOR ALL TO authenticated
  USING (private.can_manage_event(event_id))
  WITH CHECK (private.can_manage_event(event_id) AND invited_by = auth.uid());
