CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- profiles: own row or admin only
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
CREATE POLICY user_roles_admin_manage ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- invitations
DROP POLICY IF EXISTS invites_admin_all ON public.judge_invitations;
CREATE POLICY invites_admin_all ON public.judge_invitations
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- events
DROP POLICY IF EXISTS events_auth_read ON public.events;
CREATE POLICY events_auth_read ON public.events
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR status = 'active');
DROP POLICY IF EXISTS events_admin_write ON public.events;
CREATE POLICY events_admin_write ON public.events
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- rounds
DROP POLICY IF EXISTS rounds_auth_read ON public.rounds;
CREATE POLICY rounds_auth_read ON public.rounds
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = rounds.event_id AND e.status = 'active')
  );
DROP POLICY IF EXISTS rounds_admin_write ON public.rounds;
CREATE POLICY rounds_admin_write ON public.rounds
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- criteria
DROP POLICY IF EXISTS criteria_auth_read ON public.criteria;
CREATE POLICY criteria_auth_read ON public.criteria
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.rounds r JOIN public.events e ON e.id = r.event_id
      WHERE r.id = criteria.round_id AND e.status = 'active'
    )
  );
DROP POLICY IF EXISTS criteria_admin_write ON public.criteria;
CREATE POLICY criteria_admin_write ON public.criteria
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- submissions: only admins and judges may read
DROP POLICY IF EXISTS submissions_auth_read ON public.submissions;
CREATE POLICY submissions_admin_judge_read ON public.submissions
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'judge')
  );
DROP POLICY IF EXISTS submissions_admin_write ON public.submissions;
CREATE POLICY submissions_admin_write ON public.submissions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- scores / reviews admin reads
DROP POLICY IF EXISTS scores_admin_read ON public.scores;
CREATE POLICY scores_admin_read ON public.scores
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS reviews_admin_read ON public.reviews;
CREATE POLICY reviews_admin_read ON public.reviews
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);