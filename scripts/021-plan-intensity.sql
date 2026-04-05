-- Store per-day intensity when coach hides exercises
-- JSON object like {"monday":"high","tuesday":"low",...}
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS day_intensities JSONB;
