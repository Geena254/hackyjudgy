-- Team entries list their teammates' emails. Like submitter_email, these are
-- private: only the organisers and judges of the hackathon can read them (the
-- public RPCs don't return them).
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS team_member_emails text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_team_member_emails_check
  CHECK (cardinality(team_member_emails) <= 20);

GRANT INSERT (team_member_emails) ON public.submissions TO anon;
