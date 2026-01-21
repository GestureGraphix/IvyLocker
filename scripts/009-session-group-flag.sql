-- Add a flag to track if a session was intended for specific groups
-- This prevents assigning to everyone when group slug matching fails

ALTER TABLE plan_sessions
ADD COLUMN IF NOT EXISTS for_specific_groups BOOLEAN DEFAULT FALSE;

-- Update existing sessions that have group assignments
UPDATE plan_sessions ps
SET for_specific_groups = TRUE
WHERE EXISTS (
  SELECT 1 FROM plan_session_groups psg WHERE psg.plan_session_id = ps.id
);
