-- Allow half-point scores (e.g. 3.5) for the Venture Hackathon rubric.
ALTER TABLE public.scores
  ALTER COLUMN value TYPE numeric(4,1) USING value::numeric(4,1);

ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_value_check;
ALTER TABLE public.scores
  ADD CONSTRAINT scores_value_check
  CHECK (value >= 0 AND value <= 10 AND value * 2 = round(value * 2));
