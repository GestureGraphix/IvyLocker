-- Physio meetings/appointments table
CREATE TABLE IF NOT EXISTS physio_meetings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physio_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  athlete_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL DEFAULT 'Meeting',
  notes            TEXT,
  scheduled_at     TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status           TEXT DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physio_meetings_physio    ON physio_meetings(physio_id);
CREATE INDEX IF NOT EXISTS idx_physio_meetings_athlete   ON physio_meetings(athlete_id);
CREATE INDEX IF NOT EXISTS idx_physio_meetings_scheduled ON physio_meetings(scheduled_at);
