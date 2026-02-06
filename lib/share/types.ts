import type { NutritionData, TagConfig } from '@/lib/nutritionTags';

/**
 * Data required to generate a meal share card
 */
export interface MealShareData {
  /** Unique meal ID */
  id: string;
  /** Meal title / name */
  mealName: string;
  /** URL of the meal hero image (optional) */
  imageUrl?: string;
  /** Meal description / qualitative feedback */
  description?: string;
  /** Nutrition data for tag calculation and stats display */
  nutrition?: NutritionData & {
    fiber?: number;
  };
  /** Override the auto-calculated tag */
  tagOverride?: TagConfig;
  /** Whether to show nutrition stats (calories, protein, etc.) */
  showStats?: boolean;
  /** Meal type label (e.g., "Breakfast", "Lunch") */
  mealType?: string;
  /** Created at timestamp for date display */
  createdAt?: string;
}

/**
 * Result of generating a share image
 */
export interface ShareImageResult {
  /** Local file URI of the generated PNG */
  uri: string;
  /** Width of the image in pixels */
  width: number;
  /** Height of the image in pixels */
  height: number;
}
