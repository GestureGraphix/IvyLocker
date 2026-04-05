-- Extend session types to support multiple sports (crew, lacrosse, hockey, etc.)
-- Adds: video, travel, meeting, skills

ALTER TABLE plan_sessions
DROP CONSTRAINT IF EXISTS plan_sessions_session_type_check;

ALTER TABLE plan_sessions
ADD CONSTRAINT plan_sessions_session_type_check
CHECK (session_type IN (
  'practice', 'lift', 'conditioning', 'recovery', 'competition', 'optional',
  'video', 'travel', 'meeting', 'skills'
));
