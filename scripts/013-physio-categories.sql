-- Add category to mobility_logs for physio tab separation
ALTER TABLE mobility_logs
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'mobility'
  CHECK (category IN ('mobility', 'rehab', 'prehab'));
