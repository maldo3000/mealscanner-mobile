import type {
  ActivityLevel,
  BiologicalSex,
  GoalCalculationParams,
  GoalCalculationResult,
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

const FIBRE_MIN_GRAMS = 25;

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

const calculateMacroTargets = (
  goalType: NutritionGoalType,
  profile: NutritionProfileSnapshot,
  goalCalories: number,
): NutritionDailyTargets => {
  const proteinPerKg = PROTEIN_G_PER_KG[goalType];
  const proteinGrams = round(Math.max(proteinPerKg * profile.weightKg, 40));

  const fibreGrams = FIBRE_MIN_GRAMS;

  const proteinCalories = proteinGrams * KCAL_PER_GRAM_PROTEIN;
  const fibreCalories = fibreGrams * KCAL_PER_GRAM_FIBRE;

  const remainingCalories = Math.max(goalCalories - proteinCalories - fibreCalories, 0);

  const fatRatio = FAT_RATIO_BY_GOAL[goalType];
  const carbRatio = CARB_RATIO_BY_GOAL[goalType];
  const ratioSum = fatRatio + carbRatio || 1;
  const normalizedFatRatio = fatRatio / ratioSum;
  const normalizedCarbRatio = carbRatio / ratioSum;

  const fatCalories = remainingCalories * normalizedFatRatio;
  const carbCalories = remainingCalories * normalizedCarbRatio;

  const fatGrams = round(fatCalories / KCAL_PER_GRAM_FAT);
  const carbGrams = round(carbCalories / KCAL_PER_GRAM_CARB);

  const totalMacroCalories =
    proteinCalories +
    fibreCalories +
    fatGrams * KCAL_PER_GRAM_FAT +
    carbGrams * KCAL_PER_GRAM_CARB;

  const proteinRatio = round(proteinCalories / totalMacroCalories, 2);
  const fatMacroRatio = round((fatGrams * KCAL_PER_GRAM_FAT) / totalMacroCalories, 2);
  const carbMacroRatio = round((carbGrams * KCAL_PER_GRAM_CARB) / totalMacroCalories, 2);

  return {
    calories: round(goalCalories),
    proteinGrams,
    carbGrams,
    fatGrams,
    fibreGrams,
    proteinRatio,
    fatRatio: fatMacroRatio,
    carbRatio: carbMacroRatio,
  };
};

export const calculateGoalTargets = (
  params: GoalCalculationParams,
): GoalCalculationResult => {
  const { profile, goalType } = params;

  const bmr = calculateBmrMifflin(profile);
  const activityMultiplier = getActivityMultiplier(profile.activityLevel);
  const maintenanceCalories = clampCalories(bmr * activityMultiplier);

  const adjustedCalories = clampCalories(
    applyGoalAdjustment(maintenanceCalories, goalType, params.pace),
  );

  let dailyTargets = calculateMacroTargets(goalType, profile, adjustedCalories);

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

type GoalPace = 'slow' | 'moderate' | 'aggressive';






