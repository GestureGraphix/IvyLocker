-- Weekly Plans Schema
-- Allows coaches to create and assign weekly training plans to athlete groups

-- Weekly plans created by coaches
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT, -- "Week 3 - Base Building"
  week_start_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source_text TEXT, -- Original pasted text for reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Daily workouts within a weekly plan
CREATE TABLE IF NOT EXISTS plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  is_off_day BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions within a day (practice, lift, optional)
CREATE TABLE IF NOT EXISTS plan_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID REFERENCES plan_days(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('practice', 'lift', 'conditioning', 'recovery', 'competition', 'optional')),
  title TEXT,
  start_time TIME,
  end_time TIME,
  location TEXT,
  is_optional BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Which groups this session applies to (NULL = all athletes)
CREATE TABLE IF NOT EXISTS plan_session_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
  group_id UUID REFERENCES athlete_groups(id) ON DELETE CASCADE,
  UNIQUE(plan_session_id, group_id)
);

-- Exercises/activities within a session
CREATE TABLE IF NOT EXISTS plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  details TEXT, -- "5x200m 84% 5m rest"
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Which groups this exercise applies to (NULL = inherits from session)
CREATE TABLE IF NOT EXISTS plan_exercise_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_exercise_id UUID REFERENCES plan_exercises(id) ON DELETE CASCADE,
  group_id UUID REFERENCES athlete_groups(id) ON DELETE CASCADE,
  UNIQUE(plan_exercise_id, group_id)
);

-- Assigned workouts (when plan is published, creates records for each athlete)
CREATE TABLE IF NOT EXISTS assigned_workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  perceived_effort INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(athlete_id, plan_session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_plans_coach ON weekly_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_date ON weekly_plans(week_start_date);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan ON plan_days(weekly_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_sessions_day ON plan_sessions(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_session ON plan_exercises(plan_session_id);
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_athlete ON assigned_workouts(athlete_id, workout_date);
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_session ON assigned_workouts(plan_session_id);
