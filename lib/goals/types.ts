export type NutritionGoalType = 'weight_loss' | 'weight_gain' | 'maintenance' | 'custom';

export type GoalPace = 'slow' | 'moderate' | 'aggressive';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type BiologicalSex = 'male' | 'female' | 'other';

export interface NutritionProfileSnapshot {
  sex: BiologicalSex;
  /**
   * ISO date string (YYYY-MM-DD). Preferred over ageYears when available.
   */
  dateOfBirthIso?: string;
  /**
   * Explicit age in years if DOB is not provided.
   */
  ageYears?: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}

export interface NutritionDailyTargets {
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  fibreGrams: number;
  proteinRatio?: number;
  carbRatio?: number;
  fatRatio?: number;
}

export interface NutritionGoalMeta {
  focusAreas?: string[];
  source?: 'wizard' | 'manual' | 'ai';
  notes?: string;
}

export interface NutritionGoal {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  type: NutritionGoalType;
  name: string;
  profileSnapshot: NutritionProfileSnapshot;
  dailyTargets: NutritionDailyTargets;
  meta?: NutritionGoalMeta;
}

export interface GoalCalculationParams {
  profile: NutritionProfileSnapshot;
  goalType: NutritionGoalType;
  pace?: GoalPace;
  /**
   * Optional overrides for custom goals. If provided, these take precedence over
   * calculated values on a per-field basis.
   */
  customCalories?: number;
  customProteinGrams?: number;
  customCarbGrams?: number;
  customFatGrams?: number;
  customFibreGrams?: number;
}

export interface GoalCalculationResult {
  maintenanceCalories: number;
  goalCalories: number;
  dailyTargets: NutritionDailyTargets;
}

export const activityLevelMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export const paceAdjustments: Record<
  NutritionGoalType,
  Partial<Record<GoalPace, number>>
> = {
  weight_loss: {
    slow: -300,
    moderate: -500,
    aggressive: -700,
  },
  weight_gain: {
    slow: 250,
    moderate: 500,
    aggressive: 700,
  },
  maintenance: {},
  custom: {},
} as const;
export type NutritionGoalSerializable = NutritionGoal;


