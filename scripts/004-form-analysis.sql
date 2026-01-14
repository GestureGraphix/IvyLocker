-- Form Analysis Schema
-- Stores reference videos, user attempts, and analysis results for exercise form comparison

-- =====================================================
-- REFERENCE VIDEOS (Ideal Form)
-- =====================================================

CREATE TABLE IF NOT EXISTS form_reference_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_blob_path TEXT NOT NULL,
  duration_ms INTEGER,
  frame_rate DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FORM ANALYSIS SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS form_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reference_video_id UUID REFERENCES form_reference_videos(id) ON DELETE SET NULL,
  exercise_type TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_blob_path TEXT NOT NULL,
  duration_ms INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ANALYSIS RESULTS
-- =====================================================

CREATE TABLE IF NOT EXISTS form_analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID UNIQUE REFERENCES form_analyses(id) ON DELETE CASCADE,
  overall_score DECIMAL NOT NULL,
  consistency_score DECIMAL,
  key_frames JSONB NOT NULL,
  total_frames_analyzed INTEGER,
  avg_deviation_degrees DECIMAL,
  max_deviation_degrees DECIMAL,
  reference_landmarks JSONB,
  user_landmarks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- JOINT-SPECIFIC DEVIATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS form_joint_deviations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID REFERENCES form_analysis_results(id) ON DELETE CASCADE,
  joint_name TEXT NOT NULL,
  ideal_angle_avg DECIMAL NOT NULL,
  user_angle_avg DECIMAL NOT NULL,
  deviation_avg DECIMAL NOT NULL,
  deviation_max DECIMAL,
  deviation_min DECIMAL,
  frame_deviations JSONB,
  feedback TEXT,
  severity TEXT CHECK (severity IN ('good', 'minor', 'moderate', 'major')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_form_reference_videos_user ON form_reference_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_form_reference_videos_exercise ON form_reference_videos(exercise_type);
CREATE INDEX IF NOT EXISTS idx_form_analyses_user ON form_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_form_analyses_reference ON form_analyses(reference_video_id);
CREATE INDEX IF NOT EXISTS idx_form_analyses_status ON form_analyses(status);
CREATE INDEX IF NOT EXISTS idx_form_analysis_results_analysis ON form_analysis_results(analysis_id);
CREATE INDEX IF NOT EXISTS idx_form_joint_deviations_result ON form_joint_deviations(result_id);
