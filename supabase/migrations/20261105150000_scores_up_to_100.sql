-- Criteria can now be marked out of more than 10 (e.g. a rubric with
-- "Technical implementation - 25 marks"), so scores may go up to 100.
-- Half points stay allowed. Each score's upper limit is its criterion's max
-- score, which the app and the server check before saving.

ALTER TABLE public.scores DROP CONSTRAINT IF EXISTS scores_value_check;
ALTER TABLE public.scores
  ADD CONSTRAINT scores_value_check
  CHECK (value >= 0 AND value <= 100 AND value * 2 = round(value * 2));

ALTER TABLE public.ai_scores DROP CONSTRAINT IF EXISTS ai_scores_value_check;
ALTER TABLE public.ai_scores
  ADD CONSTRAINT ai_scores_value_check
  CHECK (value >= 0 AND value <= 100 AND value * 2 = round(value * 2));

ALTER TABLE public.criteria DROP CONSTRAINT IF EXISTS criteria_max_score_check;
ALTER TABLE public.criteria
  ADD CONSTRAINT criteria_max_score_check
  CHECK (max_score >= 1 AND max_score <= 100);
