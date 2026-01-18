-- Daily AI Recommendations Schema
-- Stores AI-generated daily recommendations for athletes

CREATE TABLE IF NOT EXISTS daily_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recommendation_text TEXT NOT NULL,
  priority_focus TEXT,
  model_used TEXT DEFAULT 'claude-3-haiku-20240307',
  input_tokens INTEGER,
  output_tokens INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_date ON daily_recommendations(user_id, date);
