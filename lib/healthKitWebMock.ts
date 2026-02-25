// HealthKit mock implementation for web mode testing
import { mockHealthData } from '../webMocks';

// Mock HealthKit types and constants
const UNIT_COUNT = 'count' as const;
const UNIT_KCAL = 'kcal' as const;
const UNIT_GRAM = 'g' as const;
const UNIT_MILLIGRAM = 'mg' as const;

// Mock data that changes over time
let currentStepCount = mockHealthData.steps;
let currentActivityEnergy = mockHealthData.activityEnergy;
let currentWeight = mockHealthData.weight;
let currentHeight = mockHealthData.height;

// Simulated meal sync tracking
const syncedMeals = new Set<string>();

// Helper function to simulate realistic data variation
function getVaryingValue(baseValue: number, variation = 0.1): number {
  const variationAmount = baseValue * variation;
  const randomVariation = (Math.random() - 0.5) * 2 * variationAmount;
  return Math.max(0, baseValue + randomVariation);
}

// HealthKit mock service
export const HealthKitWebMock = {
  isAvailable: async (): Promise<boolean> => {
    // Always return true for web mock
    return true;
  },

  requestPermissions: async (): Promise<boolean> => {
    if (!(await HealthKitWebMock.isAvailable())) {
      console.log('HealthKit (Web Mock) not available');
      return false;
    }

    // Simulate permission request delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('HealthKit (Web Mock) permissions granted');
    return true;
  },

  // --- ACTIVITY READ ---
  getTodaySteps: async (): Promise<number> => {
    if (!(await HealthKitWebMock.isAvailable())) return 0;
    
    // Simulate realistic step count variation
    currentStepCount = Math.floor(getVaryingValue(mockHealthData.steps, 0.2));
    console.log('HealthKit (Web Mock) today\'s steps:', currentStepCount);
    return currentStepCount;
  },

  getTodayActiveCalories: async (): Promise<number> => {
    if (!(await HealthKitWebMock.isAvailable())) return 0;
    
    // Simulate realistic calorie burn variation
    currentActivityEnergy = getVaryingValue(mockHealthData.activityEnergy, 0.15);
    console.log('HealthKit (Web Mock) today\'s active calories:', currentActivityEnergy);
    return currentActivityEnergy;
  },

  // --- NUTRITION WRITE ---
  syncMealToHealth: async (meal: {
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    timestamp: string | Date;
  }): Promise<void> => {
    if (!(await HealthKitWebMock.isAvailable())) {
      console.log('HealthKit (Web Mock) not available, skipping meal sync');
      return;
    }

    // Generate a unique ID for this meal
    const mealId = `web-meal-${Date.now()}`;
    
    if (syncedMeals.has(mealId)) {
      console.log(`Meal ${mealId} already synced to HealthKit (Web Mock)`);
      return;
    }

    try {
      console.log('HealthKit (Web Mock) syncing meal:', {
        id: mealId,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        sugar: meal.sugar,
        sodium: meal.sodium,
        timestamp: meal.timestamp
      });

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mark as synced
      syncedMeals.add(mealId);
      console.log(`Successfully synced meal ${mealId} to HealthKit (Web Mock)`);
    } catch (error) {
      console.error('Failed to sync meal to HealthKit (Web Mock):', error);
    }
  },

  // --- PROFILE READ ---
  getUserProfileData: async (): Promise<{
    weightKg: number | null;
    heightCm: number | null;
    biologicalSex: string | null;
    dateOfBirth: Date | null;
  } | null> => {
    if (!(await HealthKitWebMock.isAvailable())) return null;

    try {
      console.log('HealthKit (Web Mock) fetching profile data');
      
      // Simulate realistic profile data with some variation
      const variedWeight = getVaryingValue(mockHealthData.weight, 0.05);
      const variedHeight = getVaryingValue(mockHealthData.height, 0.02);
      
      const result = {
        weightKg: variedWeight,
        heightCm: variedHeight,
        biologicalSex: mockHealthData.biologicalSex,
        dateOfBirth: new Date(2026 - mockHealthData.age, 0, 1) // Calculate DOB based on mock age
      };
      
      console.log('HealthKit (Web Mock) profile data:', result);
      return result;
    } catch (error) {
      console.error('Error fetching profile data from HealthKit (Web Mock):', error);
      return null;
    }
  },

  // --- UTILITY METHODS ---
  getBiologicalSex: async (): Promise<string | null> => {
    if (!(await HealthKitWebMock.isAvailable())) return null;
    return mockHealthData.biologicalSex;
  },

  getDateOfBirth: async (): Promise<Date | null> => {
    if (!(await HealthKitWebMock.isAvailable())) return null;
    return new Date(2026 - mockHealthData.age, 0, 1);
  },

  getWeight: async (): Promise<number | null> => {
    if (!(await HealthKitWebMock.isAvailable())) return null;
    currentWeight = getVaryingValue(mockHealthData.weight, 0.05);
    return currentWeight;
  },

  getHeight: async (): Promise<number | null> => {
    if (!(await HealthKitWebMock.isAvailable())) return null;
    currentHeight = getVaryingValue(mockHealthData.height, 0.02);
    return currentHeight;
  },

  // --- NOTIFICATIONS ---
  setupHealthNotifications: async (): Promise<void> => {
    // No-op in web mock
    console.log('HealthKit (Web Mock) notifications setup (no-op)');
  }
};

// Export type definitions for web mock
type HealthServiceMock = typeof HealthKitWebMock;

export default HealthKitWebMock;