import { useCallback, useEffect, useState } from 'react';

import { localGoalsRepository } from '@/lib/goals/LocalGoalsRepository';
import { calculateGoalTargets } from '@/lib/goals/goalEngine';
import { useAuth } from '@/context/AuthContext';
import { saveUserGoals, getUserGoals } from '@/lib/supabase';
import type {
  ActivityLevel,
  GoalCalculationParams,
  NutritionGoal,
  NutritionGoalMeta,
  NutritionGoalType,
} from '@/lib/goals/types';

export interface NutritionGoalWizardInput extends GoalCalculationParams {
  name: string;
  meta?: NutritionGoalMeta;
}

export interface UseNutritionGoalsValue {
  activeGoal: NutritionGoal | null;
  allGoals: NutritionGoal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setGoalFromWizard: (input: NutritionGoalWizardInput) => Promise<void>;
  updateGoal: (goal: NutritionGoal) => Promise<void>;
  selectGoal: (goalId: string) => Promise<void>;
  resetGoals: () => Promise<void>;
}

const createGoalId = (): string => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `goal_${Date.now()}_${randomPart}`;
};

/**
 * Converts Supabase user_goals data to a local NutritionGoal format.
 * This is used to sync goals from Supabase (set during onboarding) to local storage.
 */
const convertSupabaseGoalToLocal = (supabaseGoal: {
  goal_type?: string;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  target_fiber?: number;
  activity_level?: string;
  dietary_restrictions?: string[];
  sex?: string;
  age_years?: number;
  height_cm?: number;
  weight_kg?: number;
  created_at?: string;
  updated_at?: string;
}): NutritionGoal => {
  const nowIso = new Date().toISOString();
  
  // Map Supabase goal_type to our NutritionGoalType
  const goalTypeMap: Record<string, NutritionGoalType> = {
    'weight_loss': 'weight_loss',
    'muscle_gain': 'weight_gain',
    'health': 'maintenance',
    'maintenance': 'maintenance',
    'weight_gain': 'weight_gain',
    'custom': 'custom',
  };
  
  const goalType: NutritionGoalType = goalTypeMap[supabaseGoal.goal_type || ''] || 'maintenance';
  
  // Map activity level
  const activityLevelMap: Record<string, ActivityLevel> = {
    'sedentary': 'sedentary',
    'light': 'light',
    'moderate': 'moderate',
    'active': 'active',
    'very_active': 'very_active',
  };
  
  const activityLevel: ActivityLevel = activityLevelMap[supabaseGoal.activity_level || ''] || 'light';

  // Map sex from Supabase (use real data if available)
  const sexMap: Record<string, 'male' | 'female' | 'other'> = {
    'male': 'male',
    'female': 'female',
    'other': 'other',
  };
  const sex = sexMap[supabaseGoal.sex || ''] || 'other';
  
  // Generate a goal name based on type
  const goalNameMap: Record<NutritionGoalType, string> = {
    'weight_loss': 'Weight Loss',
    'weight_gain': 'Build Muscle',
    'maintenance': 'Maintain Health',
    'custom': 'Custom Goal',
  };
  
  return {
    id: createGoalId(),
    version: 1,
    createdAt: supabaseGoal.created_at || nowIso,
    updatedAt: supabaseGoal.updated_at || nowIso,
    isActive: true,
    type: goalType,
    name: goalNameMap[goalType],
    profileSnapshot: {
      sex,
      ageYears: supabaseGoal.age_years ?? undefined,
      heightCm: supabaseGoal.height_cm ?? 170,
      weightKg: supabaseGoal.weight_kg ?? 70,
      activityLevel,
    },
    dailyTargets: {
      calories: supabaseGoal.target_calories || 2000,
      proteinGrams: supabaseGoal.target_protein || 100,
      carbGrams: supabaseGoal.target_carbs || 200,
      fatGrams: supabaseGoal.target_fat || 65,
      fibreGrams: supabaseGoal.target_fiber || 25,
    },
    meta: {
      source: 'wizard',
      focusAreas: supabaseGoal.dietary_restrictions || [],
    },
  };
};

export const useNutritionGoals = (): UseNutritionGoalsValue => {
  const { user } = useAuth();
  const [activeGoal, setActiveGoal] = useState<NutritionGoal | null>(null);
  const [allGoals, setAllGoals] = useState<NutritionGoal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, try to load from local storage
      let [active, all] = await Promise.all([
        localGoalsRepository.getActiveGoal(user?.id),
        localGoalsRepository.getAllGoals(user?.id),
      ]);
      
      // If no local goals exist and user is logged in, try to adopt them from
      // other sources: first the pending onboarding key (written before sign-up
      // to avoid the auth-navigation race), then Supabase as a last resort.
      if (!active && all.length === 0 && user?.id) {
        try {
          // 1. Check the pending onboarding goal (most reliable source)
          const pendingGoal = await localGoalsRepository.getPendingGoal();
          if (pendingGoal) {
            await localGoalsRepository.saveGoal(pendingGoal, user.id);
            await localGoalsRepository.clearPendingGoal();
            active = await localGoalsRepository.getActiveGoal(user.id);
            all = await localGoalsRepository.getAllGoals(user.id);
          }
        } catch (pendingErr) {
          console.warn('Failed to adopt pending onboarding goal:', pendingErr);
        }

        // 2. Still nothing? Try Supabase as a last resort
        if (!active && all.length === 0) {
          try {
            const { data: supabaseGoal, error: supabaseError } = await getUserGoals(user.id);

            if (!supabaseError && supabaseGoal) {
              const localGoal = convertSupabaseGoalToLocal(supabaseGoal);
              await localGoalsRepository.saveGoal(localGoal, user.id);

              active = await localGoalsRepository.getActiveGoal(user.id);
              all = await localGoalsRepository.getAllGoals(user.id);
            }
          } catch (syncErr) {
            console.warn('Failed to sync goals from Supabase:', syncErr);
          }
        }
      }
      
      setActiveGoal(active);
      setAllGoals(all);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load nutrition goals';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setGoalFromWizard = useCallback(
    async (input: NutritionGoalWizardInput) => {
      try {
        setLoading(true);
        setError(null);

        const { dailyTargets } = calculateGoalTargets({
          profile: input.profile,
          goalType: input.goalType,
          pace: input.pace,
          focusAreas: input.focusAreas,
          customCalories: input.customCalories,
          customProteinGrams: input.customProteinGrams,
          customCarbGrams: input.customCarbGrams,
          customFatGrams: input.customFatGrams,
          customFibreGrams: input.customFibreGrams,
        });

        const nowIso = new Date().toISOString();

        const goal: NutritionGoal = {
          id: createGoalId(),
          version: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
          isActive: true,
          type: input.goalType,
          name: input.name,
          profileSnapshot: input.profile,
          dailyTargets,
          meta: input.meta,
        };

        await localGoalsRepository.saveGoal(goal, user?.id);

        // Sync to Supabase if user is logged in
        if (user?.id) {
          await saveUserGoals(user.id, {
            goal_type: goal.type,
            target_calories: dailyTargets.calories,
            target_protein: dailyTargets.proteinGrams,
            target_carbs: dailyTargets.carbGrams,
            target_fat: dailyTargets.fatGrams,
            target_fiber: dailyTargets.fibreGrams,
            activity_level: input.profile.activityLevel,
            sex: input.profile.sex,
            age_years: input.profile.ageYears,
            height_cm: input.profile.heightCm,
            weight_kg: input.profile.weightKg,
          });
        }

        await load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save nutrition goal';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [load, user?.id],
  );

  const updateGoal = useCallback(
    async (goal: NutritionGoal) => {
      try {
        setLoading(true);
        setError(null);
        const updated: NutritionGoal = {
          ...goal,
          updatedAt: new Date().toISOString(),
        };
        await localGoalsRepository.saveGoal(updated, user?.id);

        // Sync to Supabase if user is logged in
        if (user?.id) {
          await saveUserGoals(user.id, {
            goal_type: updated.type,
            target_calories: updated.dailyTargets.calories,
            target_protein: updated.dailyTargets.proteinGrams,
            target_carbs: updated.dailyTargets.carbGrams,
            target_fat: updated.dailyTargets.fatGrams,
            target_fiber: updated.dailyTargets.fibreGrams,
            activity_level: updated.profileSnapshot.activityLevel,
            sex: updated.profileSnapshot.sex,
            age_years: updated.profileSnapshot.ageYears,
            height_cm: updated.profileSnapshot.heightCm,
            weight_kg: updated.profileSnapshot.weightKg,
          });
        }

        await load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update nutrition goal';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [load, user?.id],
  );

  const selectGoal = useCallback(
    async (goalId: string) => {
      try {
        setLoading(true);
        setError(null);
        await localGoalsRepository.setActiveGoal(goalId, user?.id);
        await load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to select nutrition goal';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [load, user?.id],
  );

  const resetGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await localGoalsRepository.clearGoals(user?.id);
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset nutrition goals';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [load, user?.id]);

  return {
    activeGoal,
    allGoals,
    loading,
    error,
    refresh: load,
    setGoalFromWizard,
    updateGoal,
    selectGoal,
    resetGoals,
  };
};






