-- 027: Per-athlete, per-day training intensity, set by the athlete themselves.
-- Shown on the athlete's calendar; fills in when the coach hasn't set an intensity.
-- Values match weekly_plans.day_intensities: rest | low | medium | high.

CREATE TABLE IF NOT EXISTS athlete_day_intensity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  intensity TEXT NOT NULL CHECK (intensity IN ('rest', 'low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT athlete_day_intensity_unique UNIQUE (athlete_id, date)
);

CREATE INDEX IF NOT EXISTS idx_athlete_day_intensity ON athlete_day_intensity(athlete_id, date);
