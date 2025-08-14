-- Create recipes table for captured meal recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  servings INTEGER,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  cuisine_type TEXT,
  source_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('image', 'text')),
  ai_analysis JSONB,
  nutrition_per_serving JSONB,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create recipe_ingredients table for structured ingredient storage
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount TEXT,
  unit TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create recipe_instructions table for step-by-step instructions
CREATE TABLE IF NOT EXISTS recipe_instructions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  time_estimate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create recipe_categories table for organization
CREATE TABLE IF NOT EXISTS recipe_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create junction table for recipe-category relationships
CREATE TABLE IF NOT EXISTS recipe_category_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES recipe_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(recipe_id, category_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_recipes_favorites ON recipes(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_order ON recipe_ingredients(recipe_id, order_index);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_order ON recipe_instructions(recipe_id, step_number);
CREATE INDEX IF NOT EXISTS idx_recipe_category_assignments_recipe ON recipe_category_assignments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_category_assignments_category ON recipe_category_assignments(category_id);

-- Add Row Level Security (RLS) policies
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_category_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Users can view their own recipes" ON recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recipes" ON recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" ON recipes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" ON recipes
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all recipes" ON recipes
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for recipe_ingredients
CREATE POLICY "Users can view ingredients of their own recipes" ON recipe_ingredients
    FOR SELECT USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage ingredients of their own recipes" ON recipe_ingredients
    FOR ALL USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all recipe ingredients" ON recipe_ingredients
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for recipe_instructions
CREATE POLICY "Users can view instructions of their own recipes" ON recipe_instructions
    FOR SELECT USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage instructions of their own recipes" ON recipe_instructions
    FOR ALL USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all recipe instructions" ON recipe_instructions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for recipe_categories (public read, admin write)
CREATE POLICY "Anyone can view recipe categories" ON recipe_categories
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage recipe categories" ON recipe_categories
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for recipe_category_assignments
CREATE POLICY "Users can view category assignments of their own recipes" ON recipe_category_assignments
    FOR SELECT USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage category assignments of their own recipes" ON recipe_category_assignments
    FOR ALL USING (
        recipe_id IN (
            SELECT id FROM recipes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all category assignments" ON recipe_category_assignments
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger for recipes
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default recipe categories
INSERT INTO recipe_categories (name, description, color, icon) VALUES
    ('Breakfast', 'Morning meals and breakfast items', '#F59E0B', 'sun.max'),
    ('Lunch', 'Midday meals and light dishes', '#10B981', 'sun.haze'),
    ('Dinner', 'Evening meals and hearty dishes', '#8B5CF6', 'moon.stars'),
    ('Snacks', 'Light bites and snack foods', '#F97316', 'leaf'),
    ('Desserts', 'Sweet treats and desserts', '#EC4899', 'heart'),
    ('Beverages', 'Drinks and beverages', '#06B6D4', 'drop'),
    ('Vegetarian', 'Plant-based recipes', '#22C55E', 'carrot'),
    ('Vegan', 'Fully plant-based recipes', '#15803D', 'leaf.circle'),
    ('Gluten-Free', 'Gluten-free recipes', '#EAB308', 'checkmark.shield'),
    ('Low-Carb', 'Low carbohydrate recipes', '#DC2626', 'minus.circle'),
    ('High-Protein', 'Protein-rich recipes', '#7C3AED', 'bolt'),
    ('Quick & Easy', 'Fast preparation recipes', '#059669', 'timer')
ON CONFLICT (name) DO NOTHING; 