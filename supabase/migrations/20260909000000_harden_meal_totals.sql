-- Forward-only baseline fix. Validate against a staging copy before deployment.
-- Existing rows are not mass-recomputed; subsequent item mutations use these totals.
BEGIN;

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
  v_sugar NUMERIC := 0;
  v_sodium NUMERIC := 0;
  v_cholesterol NUMERIC := 0;

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
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'fiber')::NUMERIC, 0)), 0),
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'sugar')::NUMERIC, 0)), 0),
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'sodium')::NUMERIC, 0)), 0),
    COALESCE(SUM(quantity * COALESCE((ai_nutrition_per_unit->>'cholesterol')::NUMERIC, 0)), 0)
  INTO v_calories, v_protein, v_carbs, v_fat, v_fiber, v_sugar, v_sodium, v_cholesterol
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
      'fiber', ROUND(v_fiber * 10) / 10,
      'sugar', ROUND(v_sugar * 10) / 10,
      'sodium', ROUND(v_sodium * 10) / 10,
      'cholesterol', ROUND(v_cholesterol * 10) / 10
    ),
    ingredients = v_ingredients
  WHERE id = p_meal_id;
END;
$$;

-- Only owner-run triggers and the ownership-checking hero RPC should call this.
REVOKE ALL ON FUNCTION public.recompute_meal_totals(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_meal_totals(UUID) TO service_role;

COMMIT;
