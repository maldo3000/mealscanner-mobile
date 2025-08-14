-- Add AI analysis fields to existing meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS analysis_version TEXT;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Create analysis_results table for detailed AI insights
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'image', 'text', 'combined'
  raw_response JSONB,
  extracted_nutrition JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_goals table for personalized recommendations
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'weight_loss', 'muscle_gain', 'maintenance', 'health'
  target_calories INTEGER,
  target_protein REAL,
  target_carbs REAL,
  target_fat REAL,
  target_fiber REAL,
  dietary_restrictions TEXT[],
  activity_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'nutrition', 'portion', 'timing', 'alternative'
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_results_meal_id ON analysis_results(meal_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_unread ON recommendations(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_meals_processing_status ON meals(processing_status);
CREATE INDEX IF NOT EXISTS idx_meals_user_analysis ON meals(user_id, processing_status);

-- Add Row Level Security (RLS) policies
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_results
CREATE POLICY "Users can view their own analysis results" ON analysis_results
    FOR SELECT USING (
        meal_id IN (
            SELECT id FROM meals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage analysis results" ON analysis_results
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_goals
CREATE POLICY "Users can manage their own goals" ON user_goals
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for recommendations
CREATE POLICY "Users can view their own recommendations" ON recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" ON recommendations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage recommendations" ON recommendations
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger for user_goals
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 