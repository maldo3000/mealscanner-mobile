export type CaptureIntent = 'snap' | 'describe' | 'search' | 'extract_recipe';

export interface DraftMealItemBase {
  localId: string;
  quantity: number;
  isHero: boolean;
  createdAtMs: number;
}

export interface DraftPhotoItem extends DraftMealItemBase {
  itemType: 'photo';
  /**
   * Local on-device URI that should remain valid across app restarts (copied into documentDirectory).
   */
  localUri: string;
}

export interface DraftTextItem extends DraftMealItemBase {
  itemType: 'text';
  text: string;
}

export interface ServingOption {
  label: string;
  grams: number;
  isDefault: boolean;
}

export interface DatabaseFoodItem {
  id: string;
  name: string;
  brand?: string;
  source: 'usda' | 'off';
  /** Nutrients are always stored per 100g for consistent math */
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sodiumPer100g?: number;
  ingredients?: string;
  servings: ServingOption[];
  barcode?: string;
  imageUrl?: string;

  // Legacy convenience accessors — derived from servings[0] at normalization time
  servingSize: number;
  servingUnit: string;
  servingText?: string;
  /** @deprecated Use caloriesPer100g with serving math */
  calories: number;
  /** @deprecated Use proteinPer100g with serving math */
  protein: number;
  /** @deprecated Use carbsPer100g with serving math */
  carbs: number;
  /** @deprecated Use fatPer100g with serving math */
  fat: number;
  fiber?: number;
  sodium?: number;
}

export interface DraftVerifiedItem extends DraftMealItemBase {
  itemType: 'verified';
  foodItem: DatabaseFoodItem;
}

export type DraftMealItem = DraftPhotoItem | DraftTextItem | DraftVerifiedItem;

export interface MealCaptureDraft {
  version: 1;
  sessionId: string;
  createdAtMs: number;
  updatedAtMs: number;
  contextText: string;
  items: DraftMealItem[];
}

/** Returns the default serving (first with `isDefault`, or first in array). */
export function getDefaultServing(item: DatabaseFoodItem): ServingOption {
  return item.servings.find(s => s.isDefault) ?? item.servings[0] ?? { label: '100g', grams: 100, isDefault: true };
}

/** Compute nutrition for a given total weight in grams. */
export function computeNutrition(item: DatabaseFoodItem, totalGrams: number) {
  const ratio = totalGrams / 100;
  return {
    calories: item.caloriesPer100g * ratio,
    protein: item.proteinPer100g * ratio,
    carbs: item.carbsPer100g * ratio,
    fat: item.fatPer100g * ratio,
    fiber: (item.fiberPer100g ?? 0) * ratio,
    sodium: (item.sodiumPer100g ?? 0) * ratio,
    totalGrams,
  };
}

/**
 * Builds a DatabaseFoodItem from per-100g nutrient values and a list of servings.
 * Sets legacy fields from the default serving for backward compat.
 */
export function buildDatabaseFoodItem(
  base: Omit<DatabaseFoodItem, 'servingSize' | 'servingUnit' | 'servingText' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sodium'>
): DatabaseFoodItem {
  const defaultServing = base.servings.find(s => s.isDefault) ?? base.servings[0] ?? { label: '100g', grams: 100, isDefault: true };
  const ratio = defaultServing.grams / 100;

  return {
    ...base,
    servingSize: defaultServing.grams,
    servingUnit: 'g',
    servingText: defaultServing.label,
    calories: base.caloriesPer100g * ratio,
    protein: base.proteinPer100g * ratio,
    carbs: base.carbsPer100g * ratio,
    fat: base.fatPer100g * ratio,
    fiber: base.fiberPer100g != null ? base.fiberPer100g * ratio : undefined,
    sodium: base.sodiumPer100g != null ? base.sodiumPer100g * ratio : undefined,
  };
}
