-- Plan-level session logs for physio assignments
-- Athletes log that they did their plan + any notes (pain, etc.)
CREATE TABLE IF NOT EXISTS physio_plan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES physio_assignments(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physio_plan_logs_assignment ON physio_plan_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_physio_plan_logs_athlete ON physio_plan_logs(athlete_id, logged_date);
