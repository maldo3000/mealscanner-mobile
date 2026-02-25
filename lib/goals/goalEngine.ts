import type {
  ActivityLevel,
  GoalCalculationParams,
  GoalCalculationResult,
  GoalPace,
  NutritionDailyTargets,
  NutritionGoalType,
  NutritionProfileSnapshot,
} from './types';
import { activityLevelMultipliers, paceAdjustments } from './types';

const MIN_CALORIES = 1200;
const MAX_CALORIES = 4500;

const PROTEIN_G_PER_KG: Record<NutritionGoalType, number> = {
  weight_loss: 1.8,
  weight_gain: 2.0,
  maintenance: 1.6,
  custom: 1.6,
};

const FIBRE_BASE_GRAMS = 25;

const FAT_RATIO_BY_GOAL: Record<NutritionGoalType, number> = {
  weight_loss: 0.30,
  weight_gain: 0.30,
  maintenance: 0.30,
  custom: 0.30,
};

const CARB_RATIO_BY_GOAL: Record<NutritionGoalType, number> = {
  weight_loss: 0.70,
  weight_gain: 0.70,
  maintenance: 0.70,
  custom: 0.70,
};

const KCAL_PER_GRAM_PROTEIN = 4;
const KCAL_PER_GRAM_CARB = 4;
const KCAL_PER_GRAM_FAT = 9;
const KCAL_PER_GRAM_FIBRE = 2;

const round = (value: number, decimals: number = 0): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const calculateAgeYears = (profile: NutritionProfileSnapshot): number | undefined => {
  if (typeof profile.ageYears === 'number') {
    return profile.ageYears;
  }
  if (!profile.dateOfBirthIso) {
    return undefined;
  }
  const dob = new Date(profile.dateOfBirthIso);
  if (Number.isNaN(dob.getTime())) {
    return undefined;
  }
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  const dayDiff = now.getDate() - dob.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
};

const getActivityMultiplier = (activityLevel: ActivityLevel): number => {
  return activityLevelMultipliers[activityLevel] ?? activityLevelMultipliers.sedentary;
};

const calculateBmrMifflin = (profile: NutritionProfileSnapshot): number => {
  const ageYears = calculateAgeYears(profile) ?? 30;
  const { sex, heightCm, weightKg } = profile;

  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  }
  if (sex === 'female') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }

  const maleBmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  return (maleBmr + femaleBmr) / 2;
};

const clampCalories = (calories: number): number => {
  if (!Number.isFinite(calories)) {
    return MIN_CALORIES;
  }
  if (calories < MIN_CALORIES) {
    return MIN_CALORIES;
  }
  if (calories > MAX_CALORIES) {
    return MAX_CALORIES;
  }
  return calories;
};

const applyGoalAdjustment = (
  maintenanceCalories: number,
  goalType: NutritionGoalType,
  pace?: GoalPace,
): number => {
  if (goalType === 'maintenance' || goalType === 'custom') {
    return maintenanceCalories;
  }

  const paceMap = paceAdjustments[goalType];
  const adjustment = pace && paceMap ? paceMap[pace] ?? 0 : 0;
  return maintenanceCalories + adjustment;
};

// ─── Focus-area modifiers ───────────────────────────────────────────────────
// Each recognised focus area can nudge protein g/kg, fat/carb split, and fibre.
// Modifiers are additive – selecting multiple focus areas stacks them.

interface FocusAreaModifier {
  /** Extra g of protein per kg body weight (additive). */
  proteinPerKgDelta?: number;
  /** Shift in fat ratio of remaining calories (additive, clamped later). */
  fatRatioDelta?: number;
  /** Shift in carb ratio of remaining calories (additive, clamped later). */
  carbRatioDelta?: number;
  /** Override fibre target in grams (takes the max if multiple). */
  fibreGrams?: number;
}

/**
 * Normalised focus-area keys. We do a case-insensitive includes match so
 * "Eat less carbs" and "eat less carbs" both hit.
 */
const FOCUS_AREA_MODIFIERS: { pattern: string; modifier: FocusAreaModifier }[] = [
  {
    pattern: 'increase protein',
    modifier: { proteinPerKgDelta: 0.4 },
  },
  {
    pattern: 'eat less carbs',
    modifier: { carbRatioDelta: -0.15, fatRatioDelta: 0.15 },
  },
  {
    pattern: 'low-carb',
    modifier: { carbRatioDelta: -0.15, fatRatioDelta: 0.15 },
  },
  {
    pattern: 'eat less sugar',
    modifier: { carbRatioDelta: -0.08, fatRatioDelta: 0.08 },
  },
  {
    pattern: 'eat less fat',
    modifier: { fatRatioDelta: -0.10, carbRatioDelta: 0.10 },
  },
  {
    pattern: 'improve fibre',
    modifier: { fibreGrams: 35 },
  },
  {
    pattern: 'eat more vegetables',
    modifier: { fibreGrams: 30 },
  },
  {
    pattern: 'manage diabetes',
    modifier: { carbRatioDelta: -0.10, fatRatioDelta: 0.05, proteinPerKgDelta: 0.1, fibreGrams: 30 },
  },
  {
    pattern: 'keto',
    modifier: { carbRatioDelta: -0.40, fatRatioDelta: 0.40 },
  },
];

interface ResolvedModifiers {
  proteinPerKgExtra: number;
  fatRatioShift: number;
  carbRatioShift: number;
  fibreOverride: number | undefined;
}

const resolveFocusAreaModifiers = (focusAreas: string[] | undefined): ResolvedModifiers => {
  const result: ResolvedModifiers = {
    proteinPerKgExtra: 0,
    fatRatioShift: 0,
    carbRatioShift: 0,
    fibreOverride: undefined,
  };

  if (!focusAreas || focusAreas.length === 0) {
    return result;
  }

  const normalised = focusAreas.map((f) => f.toLowerCase());

  for (const { pattern, modifier } of FOCUS_AREA_MODIFIERS) {
    const matched = normalised.some((f) => f.includes(pattern));
    if (!matched) continue;

    result.proteinPerKgExtra += modifier.proteinPerKgDelta ?? 0;
    result.fatRatioShift += modifier.fatRatioDelta ?? 0;
    result.carbRatioShift += modifier.carbRatioDelta ?? 0;

    if (modifier.fibreGrams != null) {
      result.fibreOverride = Math.max(result.fibreOverride ?? 0, modifier.fibreGrams);
    }
  }

  return result;
};

const calculateMacroTargets = (
  goalType: NutritionGoalType,
  profile: NutritionProfileSnapshot,
  goalCalories: number,
  focusAreas?: string[],
): NutritionDailyTargets => {
  const mods = resolveFocusAreaModifiers(focusAreas);

  // Protein: base per-kg + any focus-area boost
  const proteinPerKg = PROTEIN_G_PER_KG[goalType] + mods.proteinPerKgExtra;
  const proteinGrams = round(Math.max(proteinPerKg * profile.weightKg, 40));

  // Fibre: base or focus-area override
  const fibreGrams = mods.fibreOverride ?? FIBRE_BASE_GRAMS;

  const proteinCalories = proteinGrams * KCAL_PER_GRAM_PROTEIN;
  const fibreCalories = fibreGrams * KCAL_PER_GRAM_FIBRE;

  const remainingCalories = Math.max(goalCalories - proteinCalories - fibreCalories, 0);

  // Fat / carb split: base ratios + focus-area shifts, clamped to [0.10, 0.90]
  const clampRatio = (r: number) => Math.min(0.90, Math.max(0.10, r));
  let fatRatio = clampRatio(FAT_RATIO_BY_GOAL[goalType] + mods.fatRatioShift);
  let carbRatio = clampRatio(CARB_RATIO_BY_GOAL[goalType] + mods.carbRatioShift);

  // Normalise so they sum to 1
  const ratioSum = fatRatio + carbRatio || 1;
  fatRatio = fatRatio / ratioSum;
  carbRatio = carbRatio / ratioSum;

  const fatCalories = remainingCalories * fatRatio;
  const carbCalories = remainingCalories * carbRatio;

  const fatGrams = round(fatCalories / KCAL_PER_GRAM_FAT);
  const carbGrams = round(carbCalories / KCAL_PER_GRAM_CARB);

  const totalMacroCalories =
    proteinCalories +
    fibreCalories +
    fatGrams * KCAL_PER_GRAM_FAT +
    carbGrams * KCAL_PER_GRAM_CARB;

  const proteinRatioFinal = totalMacroCalories > 0 ? round(proteinCalories / totalMacroCalories, 2) : 0;
  const fatMacroRatio = totalMacroCalories > 0 ? round((fatGrams * KCAL_PER_GRAM_FAT) / totalMacroCalories, 2) : 0;
  const carbMacroRatio = totalMacroCalories > 0 ? round((carbGrams * KCAL_PER_GRAM_CARB) / totalMacroCalories, 2) : 0;

  return {
    calories: round(goalCalories),
    proteinGrams,
    carbGrams,
    fatGrams,
    fibreGrams,
    proteinRatio: proteinRatioFinal,
    fatRatio: fatMacroRatio,
    carbRatio: carbMacroRatio,
  };
};

export const calculateGoalTargets = (
  params: GoalCalculationParams,
): GoalCalculationResult => {
  const { profile, goalType, focusAreas } = params;

  const bmr = calculateBmrMifflin(profile);
  const activityMultiplier = getActivityMultiplier(profile.activityLevel);
  const maintenanceCalories = clampCalories(bmr * activityMultiplier);

  const adjustedCalories = clampCalories(
    applyGoalAdjustment(maintenanceCalories, goalType, params.pace),
  );

  let dailyTargets = calculateMacroTargets(goalType, profile, adjustedCalories, focusAreas);

  if (typeof params.customCalories === 'number') {
    dailyTargets = {
      ...dailyTargets,
      calories: round(params.customCalories),
    };
  }
  if (typeof params.customProteinGrams === 'number') {
    dailyTargets = {
      ...dailyTargets,
      proteinGrams: round(params.customProteinGrams),
    };
  }
  if (typeof params.customCarbGrams === 'number') {
    dailyTargets = {
      ...dailyTargets,
      carbGrams: round(params.customCarbGrams),
    };
  }
  if (typeof params.customFatGrams === 'number') {
    dailyTargets = {
      ...dailyTargets,
      fatGrams: round(params.customFatGrams),
    };
  }
  if (typeof params.customFibreGrams === 'number') {
    dailyTargets = {
      ...dailyTargets,
      fibreGrams: round(params.customFibreGrams),
    };
  }

  return {
    maintenanceCalories,
    goalCalories: dailyTargets.calories,
    dailyTargets,
  };
};






