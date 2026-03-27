-- Add soreness body map to check-in logs
ALTER TABLE check_in_logs
  ADD COLUMN IF NOT EXISTS soreness_areas JSONB DEFAULT '[]';
