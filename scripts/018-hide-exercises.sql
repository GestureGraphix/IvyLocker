-- Allow coaches to hide exercise details from athletes (surprise workouts)
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS hide_exercises BOOLEAN DEFAULT FALSE;
