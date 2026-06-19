-- 026: Per-exercise rest — rest between sets and longer rest after the exercise.
-- Rest is modelled at the exercise level (not per set): one value for rest taken
-- between sets, and an optional longer value taken after the exercise before the next.

ALTER TABLE template_exercises ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;
ALTER TABLE template_exercises ADD COLUMN IF NOT EXISTS rest_after_seconds INTEGER;

ALTER TABLE session_exercises ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;
ALTER TABLE session_exercises ADD COLUMN IF NOT EXISTS rest_after_seconds INTEGER;
