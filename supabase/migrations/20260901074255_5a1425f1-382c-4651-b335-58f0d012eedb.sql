CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  starts_on date,
  ends_on date,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_status_check CHECK (status IN ('draft','active','closed'))
);

CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  phase text NOT NULL DEFAULT 'submissions',
  deadline date,
  submission_method text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rounds_phase_check CHECK (phase IN ('submissions','judging','results'))
);

CREATE TABLE public.criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weight integer NOT NULL DEFAULT 25,
  max_score integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT criteria_weight_check CHECK (weight >= 0 AND weight <= 100),
  CONSTRAINT criteria_max_score_check CHECK (max_score BETWEEN 2 AND 10)
);

CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.rounds(id) ON DELETE SET NULL,
  title text NOT NULL,
  team_name text,
  category text,
  description text,
  submitter_name text,
  submitter_email text,
  repo_url text,
  demo_url text,
  deck_url text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submissions_status_check CHECK (status IN ('submitted','under_review','scored','ranked','disqualified'))
);

CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, criterion_id, judge_id),
  CONSTRAINT scores_value_check CHECK (value >= 0 AND value <= 10)
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback text,
  private_notes text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, judge_id)
);

CREATE INDEX submissions_event_idx ON public.submissions(event_id);
CREATE INDEX rounds_event_idx ON public.rounds(event_id);
CREATE INDEX criteria_round_idx ON public.criteria(round_id);
CREATE INDEX scores_judge_idx ON public.scores(judge_id);
CREATE INDEX reviews_judge_idx ON public.reviews(judge_id);

GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.rounds TO anon;
GRANT SELECT ON public.criteria TO anon;
GRANT INSERT ON public.submissions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rounds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.rounds TO service_role;
GRANT ALL ON public.criteria TO service_role;
GRANT ALL ON public.submissions TO service_role;
GRANT ALL ON public.scores TO service_role;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_public_read ON public.events
  FOR SELECT TO anon USING (status = 'active');
CREATE POLICY events_auth_read ON public.events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY events_admin_write ON public.events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY rounds_public_read ON public.rounds
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = rounds.event_id AND e.status = 'active'));
CREATE POLICY rounds_auth_read ON public.rounds
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rounds_admin_write ON public.rounds
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY criteria_public_read ON public.criteria
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.rounds r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = criteria.round_id AND e.status = 'active'
  ));
CREATE POLICY criteria_auth_read ON public.criteria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY criteria_admin_write ON public.criteria
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY submissions_public_insert ON public.submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'submitted'
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = submissions.event_id AND e.status = 'active')
  );
CREATE POLICY submissions_auth_read ON public.submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY submissions_admin_write ON public.submissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY scores_judge_manage ON public.scores
  FOR ALL TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (judge_id = auth.uid());
CREATE POLICY scores_admin_read ON public.scores
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY reviews_judge_manage ON public.reviews
  FOR ALL TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (judge_id = auth.uid());
CREATE POLICY reviews_admin_read ON public.reviews
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER rounds_updated_at BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER criteria_updated_at BEFORE UPDATE ON public.criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER scores_updated_at BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();