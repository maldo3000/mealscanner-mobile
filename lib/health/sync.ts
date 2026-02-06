import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMealById } from '../supabase';
import { AppleHealthService } from './AppleHealthService';

const SYNCED_MEALS_KEY = '@mealscanner/synced_meals';

export const syncMealToHealthKit = async (mealId: string) => {
  try {
    // 1. Check if HealthKit is available and permissions granted
    if (!(await AppleHealthService.isAvailable())) return;

    // 2. Check if already synced to avoid duplicates
    const syncedMealsRaw = await AsyncStorage.getItem(SYNCED_MEALS_KEY);
    const syncedMeals: string[] = syncedMealsRaw ? JSON.parse(syncedMealsRaw) : [];
    
    if (syncedMeals.includes(mealId)) {
      console.log(`Meal ${mealId} already synced to HealthKit.`);
      return;
    }

    // 3. Fetch meal data
    const { data: meal, error } = await getMealById(mealId);
    if (error || !meal) {
      console.error('Error fetching meal for sync:', error);
      return;
    }

    // 4. Ensure we have nutritional data and it's completed
    if (meal.processing_status !== 'completed' || !meal.calories) {
      console.log(`Meal ${mealId} is not ready for sync (status: ${meal.processing_status}, calories: ${meal.calories})`);
      return;
    }

    // 5. Sync to HealthKit
    await AppleHealthService.syncMealToHealth({
      calories: meal.calories,
      protein: meal.macros?.protein,
      carbs: meal.macros?.carbs,
      fat: meal.macros?.fat,
      fiber: meal.macros?.fiber,
      sugar: meal.macros?.sugar,
      sodium: meal.macros?.sodium,
      timestamp: meal.created_at,
    });

    // 6. Mark as synced
    syncedMeals.push(mealId);
    await AsyncStorage.setItem(SYNCED_MEALS_KEY, JSON.stringify(syncedMeals));
    console.log(`Successfully synced meal ${mealId} to HealthKit.`);
  } catch (error) {
    console.error('Error in syncMealToHealthKit:', error);
  }
};
