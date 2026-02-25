import { Platform } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hk: any = null;

function getHK() {
  if (!_hk) {
    if (Platform.OS !== 'ios') {
      throw new Error('HealthKit is only available on iOS');
    }
    _hk = require('@kingstinct/react-native-healthkit');
  }
  return _hk;
}

export const getNutritionTypes = () => {
  const { HKQuantityTypeIdentifier } = getHK();
  return [
    HKQuantityTypeIdentifier.dietaryEnergyConsumed,
    HKQuantityTypeIdentifier.dietaryProtein,
    HKQuantityTypeIdentifier.dietaryCarbohydrates,
    HKQuantityTypeIdentifier.dietaryFatTotal,
    HKQuantityTypeIdentifier.dietaryFiber,
    HKQuantityTypeIdentifier.dietarySugar,
    HKQuantityTypeIdentifier.dietarySodium,
  ];
};

export const getActivityReadTypes = () => {
  const { HKQuantityTypeIdentifier } = getHK();
  return [
    HKQuantityTypeIdentifier.stepCount,
    HKQuantityTypeIdentifier.activeEnergyBurned,
    HKQuantityTypeIdentifier.basalEnergyBurned,
  ];
};

export const getProfileReadTypes = () => {
  const { HKQuantityTypeIdentifier } = getHK();
  return [
    HKQuantityTypeIdentifier.height,
    HKQuantityTypeIdentifier.bodyMass,
  ];
};

export const getCharacteristicTypes = () => {
  const { HKCharacteristicTypeIdentifier } = getHK();
  return [
    HKCharacteristicTypeIdentifier.biologicalSex,
    HKCharacteristicTypeIdentifier.dateOfBirth,
  ];
};

export const AppleHealthService = {
  isAvailable: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;
    const { isHealthDataAvailable } = getHK();
    return isHealthDataAvailable();
  },

  requestPermissions: async (): Promise<boolean> => {
    if (!(await AppleHealthService.isAvailable())) {
      console.log('HealthKit not available on this platform');
      return false;
    }

    try {
      const { requestAuthorization } = getHK();
      const success = await requestAuthorization({
        toShare: [...getNutritionTypes()],
        toRead: [
          ...getNutritionTypes(),
          ...getActivityReadTypes(),
          ...getProfileReadTypes(),
          ...(getCharacteristicTypes() as any),
        ],
      });
      return success;
    } catch (error) {
      console.error('Error requesting HealthKit permissions:', error);
      return false;
    }
  },

  getTodaySteps: async (): Promise<number> => {
    if (!(await AppleHealthService.isAvailable())) return 0;

    const { HKQuantityTypeIdentifier, HKUnit, queryQuantitySamples } = getHK();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      const samples = await queryQuantitySamples(HKQuantityTypeIdentifier.stepCount, {
        from: startOfDay,
        to: now,
        unit: HKUnit.count,
      });

      return samples.reduce((sum: number, sample: any) => sum + sample.value, 0);
    } catch (error) {
      console.error('Error fetching today\'s steps:', error);
      return 0;
    }
  },

  getTodayActiveCalories: async (): Promise<number> => {
    if (!(await AppleHealthService.isAvailable())) return 0;

    const { HKQuantityTypeIdentifier, HKUnit, queryQuantitySamples } = getHK();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      const samples = await queryQuantitySamples(HKQuantityTypeIdentifier.activeEnergyBurned, {
        from: startOfDay,
        to: now,
        unit: HKUnit.kilocalorie,
      });

      return Math.round(samples.reduce((sum: number, sample: any) => sum + sample.value, 0));
    } catch (error) {
      console.error('Error fetching active calories:', error);
      return 0;
    }
  },

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

    const { HKQuantityTypeIdentifier, HKUnit, saveQuantitySample } = getHK();
    const startDate = new Date(meal.timestamp);
    const endDate = new Date(startDate.getTime() + 1000);

    try {
      const syncTasks = [];

      syncTasks.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryEnergyConsumed,
          HKUnit.kilocalorie,
          meal.calories,
          startDate,
          endDate
        )
      );

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

  getUserProfileData: async () => {
    if (!(await AppleHealthService.isAvailable())) return null;

    const { HKQuantityTypeIdentifier, HKUnit, getMostRecentQuantitySample, getBiologicalSexAsync, getDateOfBirthAsync } = getHK();

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
        biologicalSex: sex,
        dateOfBirth: dob,
      };
    } catch (error) {
      console.error('Error fetching profile data:', error);
      return null;
    }
  },
};
