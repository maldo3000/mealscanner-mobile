import {
  HKQuantityTypeIdentifier,
  HKUnit,
  HKCharacteristicTypeIdentifier,
  isHealthDataAvailable,
  requestAuthorization,
  saveQuantitySample,
  queryQuantitySamples,
  getBiologicalSexAsync,
  getDateOfBirthAsync,
  getMostRecentQuantitySample,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

export const NUTRITION_TYPES = [
  HKQuantityTypeIdentifier.dietaryEnergyConsumed,
  HKQuantityTypeIdentifier.dietaryProtein,
  HKQuantityTypeIdentifier.dietaryCarbohydrates,
  HKQuantityTypeIdentifier.dietaryFatTotal,
  HKQuantityTypeIdentifier.dietaryFiber,
  HKQuantityTypeIdentifier.dietarySugar,
  HKQuantityTypeIdentifier.dietarySodium,
];

export const ACTIVITY_READ_TYPES = [
  HKQuantityTypeIdentifier.stepCount,
  HKQuantityTypeIdentifier.activeEnergyBurned,
  HKQuantityTypeIdentifier.basalEnergyBurned,
];

export const PROFILE_READ_TYPES = [
  HKQuantityTypeIdentifier.height,
  HKQuantityTypeIdentifier.bodyMass,
];

// characteristic types are handled differently in this library usually, but let's check
export const CHARACTERISTIC_TYPES = [
  HKCharacteristicTypeIdentifier.biologicalSex,
  HKCharacteristicTypeIdentifier.dateOfBirth,
];

export const AppleHealthService = {
  isAvailable: async (): Promise<boolean> => {
    return Platform.OS === 'ios' && isHealthDataAvailable();
  },

  requestPermissions: async (): Promise<boolean> => {
    if (!(await AppleHealthService.isAvailable())) {
      console.log('HealthKit not available on this platform');
      return false;
    }

    try {
      const success = await requestAuthorization({
        // Write permissions (toShare)
        toShare: [...NUTRITION_TYPES],
        // Read permissions (toRead)
        toRead: [
          ...NUTRITION_TYPES,
          ...ACTIVITY_READ_TYPES,
          ...PROFILE_READ_TYPES,
          // Characteristics aren't always in ObjectTypeIdentifier but usually work
          ...(CHARACTERISTIC_TYPES as any), 
        ],
      });
      return success;
    } catch (error) {
      console.error('Error requesting HealthKit permissions:', error);
      return false;
    }
  },

  // --- ACTIVITY READ ---
  getTodaySteps: async (): Promise<number> => {
    if (!(await AppleHealthService.isAvailable())) return 0;
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    try {
      const samples = await queryQuantitySamples(HKQuantityTypeIdentifier.stepCount, {
        from: startOfDay,
        to: now,
        unit: HKUnit.count,
      });
      
      return samples.reduce((sum, sample) => sum + sample.value, 0);
    } catch (error) {
      console.error('Error fetching today\'s steps:', error);
      return 0;
    }
  },

  getTodayActiveCalories: async (): Promise<number> => {
    if (!(await AppleHealthService.isAvailable())) return 0;
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    try {
      const samples = await queryQuantitySamples(HKQuantityTypeIdentifier.activeEnergyBurned, {
        from: startOfDay,
        to: now,
        unit: HKUnit.kilocalorie,
      });
      
      return Math.round(samples.reduce((sum, sample) => sum + sample.value, 0));
    } catch (error) {
      console.error('Error fetching active calories:', error);
      return 0;
    }
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
    if (!(await AppleHealthService.isAvailable())) return;

    const startDate = new Date(meal.timestamp);
    const endDate = new Date(startDate.getTime() + 1000); // 1 second duration

    try {
      const syncTasks = [];

      // Energy
      syncTasks.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryEnergyConsumed,
          HKUnit.kilocalorie,
          meal.calories,
          startDate,
          endDate
        )
      );

      // Protein
      if (meal.protein) {
        syncTasks.push(
          saveQuantitySample(
            HKQuantityTypeIdentifier.dietaryProtein,
            HKUnit.gram,
            meal.protein,
            startDate,
            endDate
          )
        );
      }

      // Carbs
      if (meal.carbs) {
        syncTasks.push(
          saveQuantitySample(
            HKQuantityTypeIdentifier.dietaryCarbohydrates,
            HKUnit.gram,
            meal.carbs,
            startDate,
            endDate
          )
        );
      }

      // Fat
      if (meal.fat) {
        syncTasks.push(
          saveQuantitySample(
            HKQuantityTypeIdentifier.dietaryFatTotal,
            HKUnit.gram,
            meal.fat,
            startDate,
            endDate
          )
        );
      }

      // Fiber
      if (meal.fiber) {
        syncTasks.push(
          saveQuantitySample(
            HKQuantityTypeIdentifier.dietaryFiber,
            HKUnit.gram,
            meal.fiber,
            startDate,
            endDate
          )
        );
      }

      // Sugar
      if (meal.sugar) {
        syncTasks.push(
          saveQuantitySample(
            HKQuantityTypeIdentifier.dietarySugar,
            HKUnit.gram,
            meal.sugar,
            startDate,
            endDate
          )
        );
      }

      // Sodium (mg)
      if (meal.sodium) {
        syncTasks.push(
          saveQuantitySample(
            HKQuantityTypeIdentifier.dietarySodium,
            HKUnit.milligram,
            meal.sodium,
            startDate,
            endDate
          )
        );
      }

      await Promise.all(syncTasks);
    } catch (error) {
      console.error('Failed to sync meal to Apple Health:', error);
    }
  },

  // --- PROFILE READ ---
  getUserProfileData: async () => {
    if (!(await AppleHealthService.isAvailable())) return null;

    try {
      const [weight, height, sex, dob] = await Promise.all([
        getMostRecentQuantitySample(HKQuantityTypeIdentifier.bodyMass),
        getMostRecentQuantitySample(HKQuantityTypeIdentifier.height),
        getBiologicalSexAsync(),
        getDateOfBirthAsync(),
      ]);

      return {
        weightKg: weight ? (weight.unit === HKUnit.gram ? weight.value / 1000 : weight.value) : null,
        heightCm: height ? (height.unit === HKUnit.inch ? height.value * 2.54 : height.value) : null,
        biologicalSex: sex, // HKBiologicalSex
        dateOfBirth: dob,
      };
    } catch (error) {
      console.error('Error fetching profile data:', error);
      return null;
    }
  },
};
