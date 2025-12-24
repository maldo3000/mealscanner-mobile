-- Complete Database Setup Migration
-- Run this in your Supabase Dashboard > SQL Editor for project: glzhsfwnsupmmhwzpege
-- This creates all necessary tables and triggers for the MealScanner app

-- ============================================
-- 1. Create profiles table (if it doesn't exist)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  nutrition_goal TEXT,
  show_metrics BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. Create meals table
-- ============================================
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  image_url TEXT,
  ingredients TEXT[],
  serving_estimate TEXT,
  calories INTEGER,
  macros JSONB, -- { protein, carbs, fat, fiber }
  health_score TEXT CHECK (health_score IN ('very_healthy', 'healthy', 'needs_improvement')),
  fiber_score TEXT,
  qualitative_feedback TEXT,
  recipe TEXT,
  ai_analysis JSONB,
  analysis_version TEXT,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for meals
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meals_processing_status ON meals(processing_status);
CREATE INDEX IF NOT EXISTS idx_meals_user_analysis ON meals(user_id, processing_status);

-- Enable RLS on meals
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meals
DROP POLICY IF EXISTS "Users can view their own meals" ON meals;
CREATE POLICY "Users can view their own meals" ON meals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own meals" ON meals;
CREATE POLICY "Users can insert their own meals" ON meals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own meals" ON meals;
CREATE POLICY "Users can update their own meals" ON meals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own meals" ON meals;
CREATE POLICY "Users can delete their own meals" ON meals
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all meals" ON meals;
CREATE POLICY "Service role can manage all meals" ON meals
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 3. Create analysis_results table
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'image', 'text', 'combined'
  raw_response JSONB,
  extracted_nutrition JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_results_meal_id ON analysis_results(meal_id);

-- Enable RLS
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_results
DROP POLICY IF EXISTS "Users can view their own analysis results" ON analysis_results;
CREATE POLICY "Users can view their own analysis results" ON analysis_results
    FOR SELECT USING (
        meal_id IN (
            SELECT id FROM meals WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage analysis results" ON analysis_results;
CREATE POLICY "Service role can manage analysis results" ON analysis_results
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 4. Create user_goals table
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_goals
DROP POLICY IF EXISTS "Users can manage their own goals" ON user_goals;
CREATE POLICY "Users can manage their own goals" ON user_goals
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. Create recommendations table
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_unread ON recommendations(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recommendations
DROP POLICY IF EXISTS "Users can view their own recommendations" ON recommendations;
CREATE POLICY "Users can view their own recommendations" ON recommendations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommendations" ON recommendations;
CREATE POLICY "Users can update their own recommendations" ON recommendations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage recommendations" ON recommendations;
CREATE POLICY "Service role can manage recommendations" ON recommendations
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 6. Create triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_meals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_meals_updated_at ON meals;
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_meals_updated_at();

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_goals_updated_at ON user_goals;
CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Create trigger to auto-create profiles on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. Backfill profiles for existing users
-- ============================================
CREATE OR REPLACE FUNCTION public.backfill_user_profiles()
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.created_at,
    NOW()
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the backfill
SELECT public.backfill_user_profiles();

-- ============================================
-- 9. Grant necessary permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.meals TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.analysis_results TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_goals TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.recommendations TO postgres, anon, authenticated, service_role;

-- ============================================
-- Setup Complete!
-- ============================================
-- Verify setup by running:
-- SELECT COUNT(*) FROM profiles;
-- SELECT COUNT(*) FROM meals;

