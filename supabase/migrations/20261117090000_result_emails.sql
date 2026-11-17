-- Emailing each team its results report.
--
-- An organiser sends a team its results as a PDF: the file is attached to the
-- email and also kept in private storage, so the email's download link keeps
-- working. Each send is logged here. The link carries a random token; the
-- server looks it up and streams the PDF, so neither table nor bucket is ever
-- readable by the public directly.

CREATE TABLE IF NOT EXISTS public.result_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  -- Secret part of the download link (/report/<token>).
  token text NOT NULL UNIQUE,
  -- Path of the PDF in the result-reports bucket.
  file_path text NOT NULL,
  file_name text NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  -- Addresses SendGrid refused, with the reason, e.g. "a@b.com: bounced".
  failures text[] NOT NULL DEFAULT '{}',
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS result_emails_event_idx ON public.result_emails (event_id);
CREATE INDEX IF NOT EXISTS result_emails_submission_idx ON public.result_emails (submission_id);

GRANT SELECT ON public.result_emails TO authenticated;
GRANT ALL ON public.result_emails TO service_role;
ALTER TABLE public.result_emails ENABLE ROW LEVEL SECURITY;

-- Organisers can see which teams were sent their results. Writes happen only
-- through the server (service role), after its own organiser check.
DROP POLICY IF EXISTS result_emails_organiser_read ON public.result_emails;
CREATE POLICY result_emails_organiser_read ON public.result_emails
  FOR SELECT TO authenticated
  USING (private.can_manage_event(event_id));

-- Private bucket for the PDFs; only the service role reads or writes it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('result-reports', 'result-reports', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
