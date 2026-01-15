import { accentCoral, accentSky, accentYellow, neonGreen, softMint } from '@/constants/Colors';

export type NutritionTag = 'Balanced' | 'Protein-heavy' | 'Light' | 'Carb-forward' | 'Indulgent';

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface TagConfig {
  label: NutritionTag;
  color: string;
  icon: string;
}

export const NUTRITION_TAGS: Record<NutritionTag, TagConfig> = {
  'Protein-heavy': {
    label: 'Protein-heavy',
    color: accentSky,
    icon: 'bolt.fill',
  },
  'Light': {
    label: 'Light',
    color: softMint,
    icon: 'leaf.fill',
  },
  'Carb-forward': {
    label: 'Carb-forward',
    color: accentYellow,
    icon: 'sparkles',
  },
  'Indulgent': {
    label: 'Indulgent',
    color: accentCoral,
    icon: 'heart.fill',
  },
  'Balanced': {
    label: 'Balanced',
    color: neonGreen,
    icon: 'checkmark.seal',
  },
};

/**
 * Assigns exactly one primary tag per meal based on deterministic macro rules.
 * Priority order (top-down): Protein-heavy -> Light -> Carb-forward -> Indulgent -> Balanced
 */
export function getMealTag(data: NutritionData | undefined | null): TagConfig {
  if (!data || !data.calories) {
    return NUTRITION_TAGS['Balanced'];
  }

  const { calories, protein, carbs, fat } = data;

  // Use standard macro-to-calorie conversion factors
  const proteinCals = protein * 4;
  const carbCals = carbs * 4;
  const fatCals = fat * 9;
  
  // Use either the total of calculated macro calories or the provided calories
  const totalCals = Math.max(proteinCals + carbCals + fatCals, calories);

  const pPct = (proteinCals / totalCals) * 100;
  const cPct = (carbCals / totalCals) * 100;
  const fPct = (fatCals / totalCals) * 100;

  // 1. Protein-heavy
  // Assign if: Protein ≥ 30% of total calories AND Protein grams ≥ 25g
  if (pPct >= 30 && protein >= 25) {
    return NUTRITION_TAGS['Protein-heavy'];
  }

  // 2. Light
  // Assign if: Total calories ≤ 400 AND Fat ≤ 25% of calories
  // (Priority handled: If it's both Protein-heavy and Light, Protein-heavy wins)
  if (calories <= 400 && fPct <= 25) {
    return NUTRITION_TAGS['Light'];
  }

  // 3. Carb-forward
  // Assign if: Carbs ≥ 55% of calories AND Protein < 25% of calories
  if (cPct >= 55 && pPct < 25) {
    return NUTRITION_TAGS['Carb-forward'];
  }

  // 4. Indulgent
  // Assign if: Calories ≥ 650 OR Fat ≥ 45% of calories
  // AND Protein < 20%
  if ((calories >= 650 || fPct >= 45) && pPct < 20) {
    return NUTRITION_TAGS['Indulgent'];
  }

  // 5. Balanced (fallback)
  // If no other rule triggers, it’s Balanced
  return NUTRITION_TAGS['Balanced'];
}
