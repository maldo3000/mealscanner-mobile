import { useCallback, useEffect, useState } from 'react';

import { localGoalsRepository } from '@/lib/goals/LocalGoalsRepository';
import { calculateGoalTargets } from '@/lib/goals/goalEngine';
import type {
  GoalCalculationParams,
  NutritionGoal,
  NutritionGoalMeta,
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

export const useNutritionGoals = (): UseNutritionGoalsValue => {
  const [activeGoal, setActiveGoal] = useState<NutritionGoal | null>(null);
  const [allGoals, setAllGoals] = useState<NutritionGoal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [active, all] = await Promise.all([
        localGoalsRepository.getActiveGoal(),
        localGoalsRepository.getAllGoals(),
      ]);
      setActiveGoal(active);
      setAllGoals(all);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load nutrition goals';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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

        await localGoalsRepository.saveGoal(goal);
        await load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save nutrition goal';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [load],
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
        await localGoalsRepository.saveGoal(updated);
        await load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update nutrition goal';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [load],
  );

  const selectGoal = useCallback(
    async (goalId: string) => {
      try {
        setLoading(true);
        setError(null);
        await localGoalsRepository.setActiveGoal(goalId);
        await load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to select nutrition goal';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [load],
  );

  const resetGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await localGoalsRepository.clearGoals();
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset nutrition goals';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [load]);

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






