import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMealById } from '../supabase';
import { AppleHealthService } from './AppleHealthService';

const LEGACY_SYNCED_MEALS_KEY = '@mealscanner/synced_meals';
const REVISION_KEY = '@mealscanner/health_revision/';
const inFlight = new Map<string, Promise<void>>();

async function syncMeal(mealId: string): Promise<void> {
  if (!(await AppleHealthService.isAvailable())) return;
  // Legacy exports had no stable HealthKit IDs. Do not silently duplicate them.
  const legacyRaw = await AsyncStorage.getItem(LEGACY_SYNCED_MEALS_KEY);
  const legacy: unknown = legacyRaw ? JSON.parse(legacyRaw) : [];
  if (Array.isArray(legacy) && legacy.includes(mealId)) return;

  const { data: meal, error } = await getMealById(mealId);
  if (error) throw error;
  if (!meal || meal.processing_status !== 'completed' || typeof meal.calories !== 'number') return;
  const revision = Date.parse(meal.updated_at || meal.created_at);
  if (!Number.isFinite(revision)) throw new Error('Meal has no valid sync revision');
  const key = REVISION_KEY + mealId;
  if (Number(await AsyncStorage.getItem(key)) >= revision) return;

  await AppleHealthService.syncMealToHealth({
    id: mealId, revision, calories: meal.calories,
    protein: meal.macros?.protein, carbs: meal.macros?.carbs, fat: meal.macros?.fat,
    fiber: meal.macros?.fiber, sugar: meal.macros?.sugar, sodium: meal.macros?.sodium,
    timestamp: meal.created_at,
  });
  // Only acknowledge after every sample succeeds.
  await AsyncStorage.setItem(key, String(revision));
}

export function syncMealToHealthKit(mealId: string): Promise<void> {
  const pending = inFlight.get(mealId);
  if (pending) return pending;
  const operation = syncMeal(mealId)
    .catch(error => { console.error('Apple Health sync failed:', error); })
    .finally(() => { inFlight.delete(mealId); });
  inFlight.set(mealId, operation);
  return operation;
}
