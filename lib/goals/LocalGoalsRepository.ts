import { Platform } from 'react-native';

import type { GoalsRepository } from './GoalsRepository';
import type { NutritionGoal } from './types';

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let AsyncStorage: AsyncStorageLike | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default as AsyncStorageLike;
}

const STORAGE_BASE_KEY = 'nutrition_goals_v1';

interface StoredGoalsState {
  version: number;
  goals: NutritionGoal[];
  activeGoalId?: string;
}

const DEFAULT_STATE: StoredGoalsState = {
  version: 1,
  goals: [],
};

const parseState = (raw: string | null): StoredGoalsState => {
  if (!raw) {
    return DEFAULT_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredGoalsState>;
    if (!parsed || !Array.isArray(parsed.goals)) {
      return DEFAULT_STATE;
    }
    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      goals: parsed.goals,
      activeGoalId: parsed.activeGoalId,
    };
  } catch {
    return DEFAULT_STATE;
  }
};

export class LocalGoalsRepository implements GoalsRepository {
  private readonly storage: AsyncStorageLike | null;

  constructor(storage: AsyncStorageLike | null = AsyncStorage) {
    this.storage = storage;
  }

  private getStorageKey(userId?: string): string {
    const id = userId || 'guest';
    return `${STORAGE_BASE_KEY}_${id}`;
  }

  private async readState(userId?: string): Promise<StoredGoalsState> {
    if (!this.storage) {
      return DEFAULT_STATE;
    }
    const raw = await this.storage.getItem(this.getStorageKey(userId));
    return parseState(raw);
  }

  private async writeState(state: StoredGoalsState, userId?: string): Promise<void> {
    if (!this.storage) {
      return;
    }
    const serialised = JSON.stringify(state);
    await this.storage.setItem(this.getStorageKey(userId), serialised);
  }

  public async getActiveGoal(userId?: string): Promise<NutritionGoal | null> {
    const state = await this.readState(userId);
    if (state.activeGoalId) {
      const byId = state.goals.find((goal) => goal.id === state.activeGoalId);
      if (byId) {
        return byId;
      }
    }
    const active = state.goals.find((goal) => goal.isActive);
    return active ?? null;
  }

  public async getAllGoals(userId?: string): Promise<NutritionGoal[]> {
    const state = await this.readState(userId);
    return state.goals;
  }

  public async saveGoal(goal: NutritionGoal, userId?: string): Promise<void> {
    const state = await this.readState(userId);

    const existingIndex = state.goals.findIndex((g) => g.id === goal.id);
    const goals = [...state.goals];

    if (existingIndex >= 0) {
      goals[existingIndex] = goal;
    } else {
      goals.push(goal);
    }

    let activeGoalId = state.activeGoalId;
    if (goal.isActive) {
      activeGoalId = goal.id;
      for (const g of goals) {
        if (g.id !== goal.id && g.isActive) {
          g.isActive = false;
        }
      }
    }

    await this.writeState({
      ...state,
      goals,
      activeGoalId,
    }, userId);
  }

  public async setActiveGoal(goalId: string, userId?: string): Promise<void> {
    const state = await this.readState(userId);
    const goals = state.goals.map((goal) => ({
      ...goal,
      isActive: goal.id === goalId,
    }));

    await this.writeState({
      ...state,
      goals,
      activeGoalId: goalId,
    }, userId);
  }

  public async clearGoals(userId?: string): Promise<void> {
    const state = await this.readState(userId);
    await this.writeState({
      ...state,
      goals: [],
      activeGoalId: undefined,
    }, userId);
  }

  // ── Pending onboarding goal ───────────────────────────────────────────────
  // Saved BEFORE sign-up so the goal survives the auth-navigation race condition.

  private static readonly PENDING_KEY = 'pending_onboarding_goal_v1';

  public async savePendingGoal(goal: NutritionGoal): Promise<void> {
    if (!this.storage) return;
    await this.storage.setItem(
      LocalGoalsRepository.PENDING_KEY,
      JSON.stringify(goal),
    );
  }

  public async getPendingGoal(): Promise<NutritionGoal | null> {
    if (!this.storage) return null;
    const raw = await this.storage.getItem(LocalGoalsRepository.PENDING_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as NutritionGoal;
    } catch {
      return null;
    }
  }

  public async clearPendingGoal(): Promise<void> {
    if (!this.storage) return;
    await this.storage.removeItem(LocalGoalsRepository.PENDING_KEY);
  }
}

export const localGoalsRepository = new LocalGoalsRepository();






