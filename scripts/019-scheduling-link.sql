-- Add scheduling link field for physios (Calendly, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduling_link TEXT;
