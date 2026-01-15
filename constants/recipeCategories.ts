/**
 * Recipe category data for the Discover section
 * Used for flat card filtering UI
 */

export interface CategoryItem {
  icon: string;
  label: string;
  filter: string;
}

export interface CalorieRange {
  icon: string;
  label: string;
  min: number;
  max: number;
}

// Pick Your Diet - dietary preferences
export const DIET_TYPES: CategoryItem[] = [
  { icon: '🥕', label: 'Vegetarian', filter: 'vegetarian' },
  { icon: '🥬', label: 'Vegan', filter: 'vegan' },
  { icon: '🥑', label: 'Low Carb', filter: 'low-carb' },
  { icon: '🫛', label: 'Low Fat', filter: 'low-fat' },
  { icon: '🫐', label: 'Low Calorie', filter: 'low-calorie' },
  { icon: '🥩', label: 'High Protein', filter: 'high-protein' },
];

// Recipes by Calorie Range - progresses from light to hearty
export const CALORIE_RANGES: CalorieRange[] = [
  { icon: '🍵', label: '50-100 kcal', min: 50, max: 100 },
  { icon: '🥚', label: '100-200 kcal', min: 100, max: 200 },
  { icon: '🥗', label: '200-300 kcal', min: 200, max: 300 },
  { icon: '🌮', label: '300-400 kcal', min: 300, max: 400 },
  { icon: '🍝', label: '400-500 kcal', min: 400, max: 500 },
  { icon: '🍲', label: '500-600 kcal', min: 500, max: 600 },
];
