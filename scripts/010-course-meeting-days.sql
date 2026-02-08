-- Add meeting_days column to courses table
-- Stores which days of the week the course meets as a text array
-- Values: 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'

ALTER TABLE courses ADD COLUMN IF NOT EXISTS meeting_days TEXT[];
