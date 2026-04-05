-- Coach meetings — supports 1:1 and team-wide meetings
CREATE TABLE IF NOT EXISTS coach_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Meeting',
  notes TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_type TEXT NOT NULL DEFAULT 'individual' CHECK (meeting_type IN ('individual', 'team')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitees for each meeting
CREATE TABLE IF NOT EXISTS coach_meeting_invitees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES coach_meetings(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_meetings_coach ON coach_meetings(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_meetings_scheduled ON coach_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_coach_meeting_invitees_athlete ON coach_meeting_invitees(athlete_id);
