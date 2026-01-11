-- Locker V2 Database Schema
-- Run this script to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends neon_auth.users_sync)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id TEXT UNIQUE, -- Links to neon_auth.users_sync
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ATHLETE' CHECK (role IN ('ATHLETE', 'COACH')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Athlete profiles
CREATE TABLE IF NOT EXISTS athlete_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  sport TEXT,
  level TEXT CHECK (level IN ('Varsity', 'Club', 'JV')),
  team TEXT,
  position TEXT,
  height_cm DECIMAL,
  weight_kg DECIMAL,
  phone TEXT,
  location TEXT,
  university TEXT,
  graduation_year INTEGER,
  allergies TEXT[],
  tags TEXT[],
  hydration_goal_oz INTEGER DEFAULT 100,
  calorie_goal INTEGER DEFAULT 2500,
  protein_goal_grams INTEGER DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily check-ins
CREATE TABLE IF NOT EXISTS check_in_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mental_state INTEGER CHECK (mental_state BETWEEN 1 AND 10),
  physical_state INTEGER CHECK (physical_state BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Training sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('strength', 'conditioning', 'practice', 'competition')),
  title TEXT NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  intensity TEXT CHECK (intensity IN ('low', 'medium', 'high')),
  focus TEXT,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal logs
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  calories INTEGER,
  protein_grams DECIMAL,
  carbs_grams DECIMAL,
  fat_grams DECIMAL,
  sodium_mg DECIMAL,
  fiber_grams DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hydration logs
CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  ounces INTEGER NOT NULL,
  source TEXT DEFAULT 'water',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mobility exercises library
CREATE TABLE IF NOT EXISTS mobility_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  body_group TEXT NOT NULL CHECK (body_group IN ('Back', 'Hips', 'Shoulders', 'Ankles', 'Knees', 'Full Body')),
  youtube_url TEXT,
  sets INTEGER,
  reps INTEGER,
  duration_seconds INTEGER,
  created_by UUID REFERENCES users(id),
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mobility logs
CREATE TABLE IF NOT EXISTS mobility_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES mobility_exercises(id),
  date DATE NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  instructor TEXT,
  schedule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic items (assignments, exams, etc.)
CREATE TABLE IF NOT EXISTS academic_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'exam', 'quiz', 'project')),
  title TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coach-athlete relationships
CREATE TABLE IF NOT EXISTS coach_athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, athlete_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date_time);
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date ON hydration_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_user_date ON check_in_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_academic_items_user_due ON academic_items(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_mobility_logs_user_date ON mobility_logs(user_id, date);
