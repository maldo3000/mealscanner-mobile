-- Add meal_items table to support multi-item meals (photos + text) with quantities

-- Extend meals with multi-item metadata (backward compatible)
ALTER TABLE meals ADD COLUMN IF NOT EXISTS context_text TEXT;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS items_count INTEGER NOT NULL DEFAULT 0;

-- Create meal_items table
CREATE TABLE IF NOT EXISTS meal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('photo', 'text')),
  image_url TEXT,
  text TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_hero BOOLEAN NOT NULL DEFAULT FALSE,
  ai_nutrition_per_unit JSONB,
  ai_ingredients TEXT[],
  ai_confidence REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT meal_items_type_content_check CHECK (
    (item_type = 'photo' AND image_url IS NOT NULL AND text IS NULL) OR
    (item_type = 'text' AND text IS NOT NULL AND image_url IS NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal_order ON meal_items(meal_id, order_index);
-- Ensure at most one hero item per meal
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_items_one_hero ON meal_items(meal_id) WHERE is_hero = TRUE;

-- Enable Row Level Security (RLS)
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_items
DROP POLICY IF EXISTS "Users can view items of their own meals" ON meal_items;
CREATE POLICY "Users can view items of their own meals" ON meal_items
    FOR SELECT USING (
        meal_id IN (
            SELECT id FROM meals WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert items for their own meals" ON meal_items;
CREATE POLICY "Users can insert items for their own meals" ON meal_items
    FOR INSERT WITH CHECK (
        meal_id IN (
            SELECT id FROM meals WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update items for their own meals" ON meal_items;
CREATE POLICY "Users can update items for their own meals" ON meal_items
    FOR UPDATE USING (
        meal_id IN (
            SELECT id FROM meals WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete items for their own meals" ON meal_items;
CREATE POLICY "Users can delete items for their own meals" ON meal_items
    FOR DELETE USING (
        meal_id IN (
            SELECT id FROM meals WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage all meal items" ON meal_items;
CREATE POLICY "Service role can manage all meal items" ON meal_items
    FOR ALL USING (auth.role() = 'service_role');

-- updated_at trigger for meal_items (reuses update_updated_at_column() from setup)
DROP TRIGGER IF EXISTS update_meal_items_updated_at ON meal_items;
CREATE TRIGGER update_meal_items_updated_at BEFORE UPDATE ON meal_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recompute meal totals from meal_items (per-unit nutrition * quantity)
CREATE OR REPLACE FUNCTION public.recompute_meal_totals(p_meal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items_count INTEGER := 0;
  v_hero_url TEXT := NULL;

  v_calories NUMERIC := 0;
  v_protein NUMERIC := 0;
  v_carbs NUMERIC := 0;
  v_fat NUMERIC := 0;
  v_fiber NUMERIC := 0;

  v_ingredients TEXT[] := NULL;
BEGIN
  -- Count items
  SELECT COUNT(*)
  INTO v_items_count
  FROM public.meal_items
  WHERE meal_id = p_meal_id;

  -- Determine hero image URL (prefer explicit hero photo, else first photo)
  SELECT image_url
  INTO v_hero_url
  FROM public.meal_items
  WHERE meal_id = p_meal_id
    AND item_type = 'photo'
    AND is_hero = TRUE
    AND image_url IS NOT NULL
  ORDER BY order_index ASC, created_at ASC
  LIMIT 1;

  IF v_hero_url IS NULL THEN
    SELECT image_url
    INTO v_hero_url
    FROM public.meal_items
    WHERE meal_id = p_meal_id
      AND item_type = 'photo'
      AND image_url IS NOT NULL
    ORDER BY order_index ASC, created_at ASC
    LIMIT 1;
  END IF;

  -- Aggregate totals (per-unit nutrition multiplied by quantity)
  SELECT
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'calories')::NUMERIC, 0)), 0),
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'protein')::NUMERIC, 0)), 0),
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'carbs')::NUMERIC, 0)), 0),
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'fat')::NUMERIC, 0)), 0),
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'fiber')::NUMERIC, 0)), 0)
  INTO v_calories, v_protein, v_carbs, v_fat, v_fiber
  FROM public.meal_items
  WHERE meal_id = p_meal_id;

  -- Aggregate distinct ingredients across items (optional)
  SELECT ARRAY(
    SELECT DISTINCT ingredient
    FROM (
      SELECT UNNEST(ai_ingredients) AS ingredient
      FROM public.meal_items
      WHERE meal_id = p_meal_id
        AND ai_ingredients IS NOT NULL
    ) s
    WHERE ingredient IS NOT NULL AND ingredient <> ''
  )
  INTO v_ingredients;

  UPDATE public.meals
  SET
    items_count = v_items_count,
    image_url = v_hero_url,
    calories = ROUND(v_calories)::INTEGER,
    macros = jsonb_build_object(
      'protein', ROUND(v_protein * 10) / 10,
      'carbs', ROUND(v_carbs * 10) / 10,
      'fat', ROUND(v_fat * 10) / 10,
      'fiber', ROUND(v_fiber * 10) / 10
    ),
    ingredients = v_ingredients
  WHERE id = p_meal_id;
END;
$$;

-- Trigger to recompute totals whenever meal_items change
CREATE OR REPLACE FUNCTION public.meal_items_recompute_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_meal_totals(COALESCE(NEW.meal_id, OLD.meal_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS meal_items_recompute_after_insert ON meal_items;
CREATE TRIGGER meal_items_recompute_after_insert
AFTER INSERT ON meal_items
FOR EACH ROW EXECUTE FUNCTION public.meal_items_recompute_trigger();

DROP TRIGGER IF EXISTS meal_items_recompute_after_update ON meal_items;
CREATE TRIGGER meal_items_recompute_after_update
AFTER UPDATE ON meal_items
FOR EACH ROW EXECUTE FUNCTION public.meal_items_recompute_trigger();

DROP TRIGGER IF EXISTS meal_items_recompute_after_delete ON meal_items;
CREATE TRIGGER meal_items_recompute_after_delete
AFTER DELETE ON meal_items
FOR EACH ROW EXECUTE FUNCTION public.meal_items_recompute_trigger();

-- RPC helper: set hero item safely (avoids partial-unique index conflicts)
CREATE OR REPLACE FUNCTION public.set_meal_hero_item(p_meal_id UUID, p_meal_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure caller owns the meal
  IF NOT EXISTS (
    SELECT 1 FROM public.meals WHERE id = p_meal_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify this meal';
  END IF;

  UPDATE public.meal_items
  SET is_hero = FALSE
  WHERE meal_id = p_meal_id AND is_hero = TRUE;

  UPDATE public.meal_items
  SET is_hero = TRUE
  WHERE id = p_meal_item_id AND meal_id = p_meal_id;

  PERFORM public.recompute_meal_totals(p_meal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_meal_hero_item(UUID, UUID) TO authenticated;

-- Table privileges (RLS still applies)
GRANT ALL ON public.meal_items TO postgres, anon, authenticated, service_role;

