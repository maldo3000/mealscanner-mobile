-- Add meal_type column to meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS meal_type TEXT;

-- Update existing meals to have a meal_type based on their created_at if possible
-- (Optional, but helps with consistency)
UPDATE meals 
SET meal_type = CASE 
    WHEN EXTRACT(HOUR FROM created_at) < 11 THEN 'Breakfast'
    WHEN EXTRACT(HOUR FROM created_at) < 16 THEN 'Lunch'
    WHEN EXTRACT(HOUR FROM created_at) < 19 THEN 'Dinner'
    ELSE 'Snack'
END
WHERE meal_type IS NULL;












