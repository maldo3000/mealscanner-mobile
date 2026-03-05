-- Optimize common RLS subqueries that filter parent rows by owner and return IDs.
-- This improves patterns like:
--   meal_id IN (SELECT id FROM meals WHERE user_id = auth.uid())
--   recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid())
CREATE INDEX IF NOT EXISTS idx_meals_user_id_id ON public.meals(user_id, id);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id_id ON public.recipes(user_id, id);
