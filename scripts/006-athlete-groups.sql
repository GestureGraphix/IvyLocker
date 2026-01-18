-- Athlete Groups Schema
-- Allows coaches to organize athletes into groups (SS, LS, Jumps, etc.)

-- Athlete groups created by coaches
CREATE TABLE IF NOT EXISTS athlete_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- 'sprints-short', 'hurdles'
  color TEXT DEFAULT '#6366f1', -- For UI display (hex color)
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, slug)
);

-- Athletes can belong to multiple groups
CREATE TABLE IF NOT EXISTS athlete_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES athlete_groups(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(athlete_id, group_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_athlete_groups_coach ON athlete_groups(coach_id);
CREATE INDEX IF NOT EXISTS idx_group_members_athlete ON athlete_group_members(athlete_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON athlete_group_members(group_id);

-- Default groups for track & field (optional - coach can customize)
-- These will be inserted when a coach first creates groups
