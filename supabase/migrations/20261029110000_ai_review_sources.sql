-- What AI grading read for each entry (GitHub README and file list, pitch deck),
-- and which links it could not read, so organisers can see what a score is based on.
ALTER TABLE public.ai_reviews ADD COLUMN IF NOT EXISTS sources text[] NOT NULL DEFAULT '{}';
