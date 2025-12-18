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

const STORAGE_KEY = 'nutrition_goals_v1';

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

  private async readState(): Promise<StoredGoalsState> {
    if (!this.storage) {
      return DEFAULT_STATE;
    }
    const raw = await this.storage.getItem(STORAGE_KEY);
    return parseState(raw);
  }

  private async writeState(state: StoredGoalsState): Promise<void> {
    if (!this.storage) {
      return;
    }
    const serialised = JSON.stringify(state);
    await this.storage.setItem(STORAGE_KEY, serialised);
  }

  public async getActiveGoal(): Promise<NutritionGoal | null> {
    const state = await this.readState();
    if (state.activeGoalId) {
      const byId = state.goals.find((goal) => goal.id === state.activeGoalId);
      if (byId) {
        return byId;
      }
    }
    const active = state.goals.find((goal) => goal.isActive);
    return active ?? null;
  }

  public async getAllGoals(): Promise<NutritionGoal[]> {
    const state = await this.readState();
    return state.goals;
  }

  public async saveGoal(goal: NutritionGoal): Promise<void> {
    const state = await this.readState();

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
    });
  }

  public async setActiveGoal(goalId: string): Promise<void> {
    const state = await this.readState();
    const goals = state.goals.map((goal) => ({
      ...goal,
      isActive: goal.id === goalId,
    }));

    await this.writeState({
      ...state,
      goals,
      activeGoalId: goalId,
    });
  }

  public async clearGoals(): Promise<void> {
    const state = await this.readState();
    await this.writeState({
      ...state,
      goals: [],
      activeGoalId: undefined,
    });
  }
}

export const localGoalsRepository = new LocalGoalsRepository();






