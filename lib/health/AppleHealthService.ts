import { Platform } from 'react-native';

import type {
    CharacteristicTypeIdentifier,
    ObjectTypeIdentifier,
    QuantityTypeIdentifier,
    SampleTypeIdentifierWriteable,
    Unit,
} from '@kingstinct/react-native-healthkit';
import {
    getBiologicalSexAsync,
    getDateOfBirthAsync,
    getMostRecentQuantitySample,
    isHealthDataAvailable,
    queryQuantitySamples,
    requestAuthorization,
    saveQuantitySample,
} from '@kingstinct/react-native-healthkit';

// v13+ uses string identifiers/units (not runtime enums)
const UNIT_COUNT = 'count' as const satisfies Unit;
const UNIT_KCAL = 'kcal' as const satisfies Unit;
const UNIT_GRAM = 'g' as const satisfies Unit;
const UNIT_MILLIGRAM = 'mg' as const satisfies Unit;

const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount' as const satisfies QuantityTypeIdentifier;
const ACTIVE_ENERGY_BURNED =
  'HKQuantityTypeIdentifierActiveEnergyBurned' as const satisfies QuantityTypeIdentifier;

const DIETARY_ENERGY_CONSUMED =
  'HKQuantityTypeIdentifierDietaryEnergyConsumed' as const satisfies QuantityTypeIdentifier;
const DIETARY_PROTEIN =
  'HKQuantityTypeIdentifierDietaryProtein' as const satisfies QuantityTypeIdentifier;
const DIETARY_CARBOHYDRATES =
  'HKQuantityTypeIdentifierDietaryCarbohydrates' as const satisfies QuantityTypeIdentifier;
const DIETARY_FAT_TOTAL =
  'HKQuantityTypeIdentifierDietaryFatTotal' as const satisfies QuantityTypeIdentifier;
const DIETARY_FIBER =
  'HKQuantityTypeIdentifierDietaryFiber' as const satisfies QuantityTypeIdentifier;
const DIETARY_SUGAR =
  'HKQuantityTypeIdentifierDietarySugar' as const satisfies QuantityTypeIdentifier;
const DIETARY_SODIUM =
  'HKQuantityTypeIdentifierDietarySodium' as const satisfies QuantityTypeIdentifier;

const HEIGHT = 'HKQuantityTypeIdentifierHeight' as const satisfies QuantityTypeIdentifier;
const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass' as const satisfies QuantityTypeIdentifier;

export const NUTRITION_TYPES = [
  DIETARY_ENERGY_CONSUMED,
  DIETARY_PROTEIN,
  DIETARY_CARBOHYDRATES,
  DIETARY_FAT_TOTAL,
  DIETARY_FIBER,
  DIETARY_SUGAR,
  DIETARY_SODIUM,
] as const satisfies readonly SampleTypeIdentifierWriteable[];

export const ACTIVITY_READ_TYPES = [
  STEP_COUNT,
  ACTIVE_ENERGY_BURNED,
  'HKQuantityTypeIdentifierBasalEnergyBurned',
] as const satisfies readonly QuantityTypeIdentifier[];

export const PROFILE_READ_TYPES = [HEIGHT, BODY_MASS] as const satisfies readonly QuantityTypeIdentifier[];

export const CHARACTERISTIC_TYPES = [
  'HKCharacteristicTypeIdentifierBiologicalSex',
  'HKCharacteristicTypeIdentifierDateOfBirth',
] as const satisfies readonly CharacteristicTypeIdentifier[];

function toKilograms(quantity: number, unit: string): number | null {
  if (!Number.isFinite(quantity)) return null;

  switch (unit) {
    case 'kg':
      return quantity;
    case 'g':
      return quantity / 1000;
    case 'mg':
      return quantity / 1_000_000;
    case 'lb':
      return quantity * 0.45359237;
    case 'oz':
      return quantity * 0.028349523125;
    case 'st':
      return quantity * 6.35029318;
    default:
      return null;
  }
}

function toCentimeters(quantity: number, unit: string): number | null {
  if (!Number.isFinite(quantity)) return null;

  switch (unit) {
    case 'cm':
      return quantity;
    case 'm':
      return quantity * 100;
    case 'mm':
      return quantity / 10;
    case 'in':
      return quantity * 2.54;
    case 'ft':
      return quantity * 30.48;
    case 'yd':
      return quantity * 91.44;
    default:
      return null;
  }
}

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
      const toRead: readonly ObjectTypeIdentifier[] = [
        ...NUTRITION_TYPES,
        ...ACTIVITY_READ_TYPES,
        ...PROFILE_READ_TYPES,
        ...CHARACTERISTIC_TYPES,
      ];

      const success = await requestAuthorization({
        // Write permissions (toShare)
        toShare: [...NUTRITION_TYPES],
        // Read permissions (toRead)
        toRead,
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
      const samples = await queryQuantitySamples(STEP_COUNT, {
        limit: -1,
        unit: UNIT_COUNT,
        filter: {
          date: {
            startDate: startOfDay,
            endDate: now,
          },
        },
      });
      
      return samples.reduce((sum, sample) => sum + sample.quantity, 0);
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
      const samples = await queryQuantitySamples(ACTIVE_ENERGY_BURNED, {
        limit: -1,
        unit: UNIT_KCAL,
        filter: {
          date: {
            startDate: startOfDay,
            endDate: now,
          },
        },
      });
      
      return Math.round(samples.reduce((sum, sample) => sum + sample.quantity, 0));
    } catch (error) {
      console.error('Error fetching active calories:', error);
      return 0;
    }
  },

  // --- NUTRITION WRITE ---
  syncMealToHealth: async (meal: {
    id: string;
    revision: number;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    timestamp: string | Date;
  }): Promise<void> => {
    if (!(await AppleHealthService.isAvailable())) throw new Error('HealthKit is unavailable');
    const startDate = new Date(meal.timestamp);
    if (!Number.isFinite(meal.calories) || meal.calories < 0 || !Number.isFinite(startDate.getTime())) {
      throw new Error('Invalid meal nutrition or timestamp');
    }
    const endDate = new Date(startDate.getTime() + 1000);
    const samples: [Parameters<typeof saveQuantitySample>[0], Unit, number | undefined][] = [
      [DIETARY_ENERGY_CONSUMED, UNIT_KCAL, meal.calories],
      [DIETARY_PROTEIN, UNIT_GRAM, meal.protein],
      [DIETARY_CARBOHYDRATES, UNIT_GRAM, meal.carbs],
      [DIETARY_FAT_TOTAL, UNIT_GRAM, meal.fat],
      [DIETARY_FIBER, UNIT_GRAM, meal.fiber],
      [DIETARY_SUGAR, UNIT_GRAM, meal.sugar],
      [DIETARY_SODIUM, UNIT_MILLIGRAM, meal.sodium],
    ];
    // Stable identifiers make retries after partial writes safe. Higher versions
    // replace prior samples instead of adding duplicate nutrition.
    const results = await Promise.allSettled(samples.flatMap(([type, unit, value]) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? [saveQuantitySample(type, unit, value, startDate, endDate, {
            HKSyncIdentifier: 'mealscanner:' + meal.id + ':' + type,
            HKSyncVersion: meal.revision,
          })]
        : []
    ));
    if (results.some(result => result.status === 'rejected' || !result.value)) {
      throw new Error('Some nutrition samples could not be saved to Apple Health. Sync will retry.');
    }
  },

  // --- PROFILE READ ---
  getUserProfileData: async () => {
    if (!(await AppleHealthService.isAvailable())) return null;

    try {
      const [weight, height, sex, dob] = await Promise.all([
        getMostRecentQuantitySample(BODY_MASS),
        getMostRecentQuantitySample(HEIGHT),
        getBiologicalSexAsync(),
        getDateOfBirthAsync(),
      ]);

      return {
        weightKg: weight ? toKilograms(weight.quantity, weight.unit) : null,
        heightCm: height ? toCentimeters(height.quantity, height.unit) : null,
        biologicalSex: sex,
        dateOfBirth: dob,
      };
    } catch (error) {
      console.error('Error fetching profile data:', error);
      return null;
    }
  },
};
