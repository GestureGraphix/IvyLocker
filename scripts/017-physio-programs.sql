-- Physio Program Management System
-- Adds structured sessions and per-exercise completion tracking to physio assignments

-- ============================================================================
-- 1. Physio exercise library (global seed + physio's custom exercises)
-- ============================================================================
CREATE TABLE IF NOT EXISTS physio_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  body_region TEXT,
  category TEXT DEFAULT 'general',
  default_sets INTEGER,
  default_reps TEXT,
  default_hold_seconds INTEGER,
  default_duration_seconds INTEGER,
  instructions TEXT,
  physio_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physio_exercises_physio ON physio_exercises(physio_id);
CREATE INDEX IF NOT EXISTS idx_physio_exercises_region ON physio_exercises(body_region);

-- ============================================================================
-- 2. Program sessions (a specific day's exercises within a program)
-- ============================================================================
CREATE TABLE IF NOT EXISTS physio_program_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES physio_assignments(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  title TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physio_sessions_assignment ON physio_program_sessions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_physio_sessions_date ON physio_program_sessions(session_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_physio_sessions_assign_date ON physio_program_sessions(assignment_id, session_date);

-- ============================================================================
-- 3. Exercises within a session
-- ============================================================================
CREATE TABLE IF NOT EXISTS physio_session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES physio_program_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES physio_exercises(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sets INTEGER,
  reps TEXT,
  hold_seconds INTEGER,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  side TEXT CHECK (side IN ('left', 'right', 'bilateral')),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON physio_session_exercises(session_id);

-- ============================================================================
-- 4. Per-exercise completion tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS physio_exercise_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES physio_session_exercises(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  UNIQUE(exercise_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_completions_athlete ON physio_exercise_completions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_exercise ON physio_exercise_completions(exercise_id);

-- ============================================================================
-- 5. Overall session completion tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS physio_session_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES physio_program_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  perceived_effort INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
  notes TEXT,
  UNIQUE(session_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_session_completions_athlete ON physio_session_completions(athlete_id);

-- ============================================================================
-- 6. Seed global physio exercises
-- ============================================================================
INSERT INTO physio_exercises (name, body_region, category, default_sets, default_reps, default_hold_seconds, instructions) VALUES
  ('Clamshells', 'hip', 'strengthen', 3, '15', NULL, 'Side-lying, knees bent 90 degrees. Open top knee keeping feet together.'),
  ('Banded Monster Walks', 'hip', 'strengthen', 3, '10 each', NULL, 'Mini band above knees, quarter squat, step laterally.'),
  ('Single Leg RDL', 'hip', 'balance', 3, '10 each', NULL, 'Hinge at hip, keep back flat, slight knee bend on stance leg.'),
  ('Glute Bridge', 'hip', 'strengthen', 3, '15', 3, 'Feet flat, squeeze glutes at top, controlled lower.'),
  ('Quad Set', 'knee', 'strengthen', 3, '10', 5, 'Push knee into table, tighten quad, hold.'),
  ('Terminal Knee Extension', 'knee', 'strengthen', 3, '15', NULL, 'Band behind knee, straighten from 30 degrees to full extension.'),
  ('Straight Leg Raise', 'knee', 'strengthen', 3, '15', NULL, 'Tighten quad, lift leg to 45 degrees, slow lower.'),
  ('Sleeper Stretch', 'shoulder', 'stretch', 2, '3', 30, 'Side-lying, shoulder and elbow at 90 degrees, press forearm toward floor.'),
  ('External Rotation with Band', 'shoulder', 'strengthen', 3, '15', NULL, 'Elbow at side, rotate forearm outward against band resistance.'),
  ('YTWL', 'shoulder', 'strengthen', 2, '10 each', NULL, 'Prone on bench, arms in Y, T, W, L positions with light weight.'),
  ('Cat-Cow', 'back', 'mobilize', 1, '10', NULL, 'On all fours, alternate between arching and rounding spine.'),
  ('Bird Dog', 'back', 'strengthen', 3, '10 each', 3, 'On all fours, extend opposite arm and leg, hold.'),
  ('Dead Bug', 'back', 'strengthen', 3, '10 each', NULL, 'Supine, arms up, knees 90. Extend opposite arm/leg while bracing core.'),
  ('Ankle Alphabet', 'ankle', 'mobilize', 1, '1', NULL, 'Trace each letter of the alphabet with your big toe.'),
  ('Single Leg Balance', 'ankle', 'balance', 3, '1', 30, 'Stand on one leg, eyes open. Progress to eyes closed.'),
  ('Towel Scrunches', 'ankle', 'strengthen', 3, '15', NULL, 'Seated, scrunch towel toward you with toes.'),
  ('Chin Tucks', 'neck', 'strengthen', 3, '10', 5, 'Seated upright, draw chin straight back creating a double chin.'),
  ('Foam Roll IT Band', 'hip', 'mobilize', 1, '1', 60, 'Side-lying on roller, roll from hip to just above knee.'),
  ('Pigeon Stretch', 'hip', 'stretch', 2, '1', 30, 'Front knee bent, back leg extended. Lean forward over front leg.'),
  ('Wall Slide', 'shoulder', 'mobilize', 3, '10', NULL, 'Back against wall, slide arms up overhead maintaining contact.')
ON CONFLICT DO NOTHING;
