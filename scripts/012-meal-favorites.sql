-- Meal favorites for dining hall items
CREATE TABLE IF NOT EXISTS meal_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  location_slug TEXT,
  calories INTEGER,
  protein_grams DECIMAL,
  carbs_grams DECIMAL,
  fat_grams DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_meal_favorites_user ON meal_favorites(user_id);
