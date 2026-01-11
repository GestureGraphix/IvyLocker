-- Training Exercises and Templates Schema
-- Migration to add exercise details to sessions and training templates

-- =====================================================
-- EXERCISES AND SETS FOR SESSIONS
-- =====================================================

-- Exercises within a training session
CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sets within an exercise
CREATE TABLE IF NOT EXISTS session_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID REFERENCES session_exercises(id) ON DELETE CASCADE,
  reps INTEGER NOT NULL,
  weight DECIMAL,
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRAINING TEMPLATES
-- =====================================================

-- Training templates (reusable session blueprints)
CREATE TABLE IF NOT EXISTS training_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('strength', 'conditioning', 'practice', 'competition')),
  duration_minutes INTEGER DEFAULT 60,
  intensity TEXT CHECK (intensity IN ('low', 'medium', 'high')),
  focus TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises within a template
CREATE TABLE IF NOT EXISTS template_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES training_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sets within a template exercise
CREATE TABLE IF NOT EXISTS template_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID REFERENCES template_exercises(id) ON DELETE CASCADE,
  reps INTEGER NOT NULL,
  weight DECIMAL,
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEMPLATE SCHEDULING
-- =====================================================

-- Weekly schedule for templates (recurring sessions)
CREATE TABLE IF NOT EXISTS template_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES training_templates(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  weekdays INTEGER[] NOT NULL, -- Array of weekday numbers: 0=Sun, 1=Mon, ..., 6=Sat
  start_time TIME NOT NULL,
  end_date DATE, -- Optional end date for recurrence
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id) -- One schedule per template
);

-- Track generated sessions to prevent duplicates
-- Add template reference to sessions table
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES training_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_session_sets_exercise ON session_sets(exercise_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_training_templates_user ON training_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_template_sets_exercise ON template_sets(exercise_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_template_schedules_template ON template_schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_template_date ON sessions(template_id, scheduled_date);
