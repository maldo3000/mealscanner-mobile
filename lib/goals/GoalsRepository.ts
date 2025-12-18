import type { NutritionGoal } from './types';

export interface GoalsRepository {
  getActiveGoal(): Promise<NutritionGoal | null>;
  getAllGoals(): Promise<NutritionGoal[]>;
  saveGoal(goal: NutritionGoal): Promise<void>;
  setActiveGoal(goalId: string): Promise<void>;
  clearGoals(): Promise<void>;
}






