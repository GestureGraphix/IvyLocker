-- Physio role and assignments schema

-- Extend role check constraint to include PHYSIO
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ATHLETE', 'COACH', 'PHYSIO'));

-- Physio-athlete relationships (similar to coach_athletes)
CREATE TABLE IF NOT EXISTS physio_athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physio_id UUID REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(physio_id, athlete_id)
);

-- Prehab / rehab assignment protocols created by physios
CREATE TABLE IF NOT EXISTS physio_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physio_id UUID REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'prehab' CHECK (type IN ('prehab', 'rehab')),
  exercises JSONB DEFAULT '[]',  -- [{ name, sets, reps, notes }]
  frequency TEXT,                -- "Daily", "3x per week", etc.
  duration_weeks INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physio_assignments_athlete ON physio_assignments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_physio_assignments_physio  ON physio_assignments(physio_id);
CREATE INDEX IF NOT EXISTS idx_physio_athletes_physio     ON physio_athletes(physio_id);
