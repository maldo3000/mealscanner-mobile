// Web compatibility and mocking layer for Expo web mode
import { Platform } from 'react-native';

// Detect if we're running in web mode
export const isWebMode = Platform.OS === 'web';

// Mock user data for web testing
export const mockUser = {
  id: 'web-user-123',
  email: 'webtest@mealscanner.app',
  full_name: 'Web Test User',
  avatar_url: null,
  nutrition_goal: 'lose_weight',
  show_metrics: true,
  subscription_tier: 'pro'
};

// Mock meal data for web testing
export const mockMealData = {
  id: 'web-meal-123',
  name: 'Test Meal',
  image_url: 'https://via.placeholder.com/300x300.png?text=Test+Meal',
  calories: 450,
  protein_g: 25,
  carbs_g: 45,
  fat_g: 15,
  fiber_g: 8,
  sugar_g: 12,
  sodium_mg: 400,
  cholesterol_mg: 65,
  confidence: 0.85,
  created_at: new Date().toISOString()
};

// Mock recipe data for web testing
export const mockRecipeData = {
  id: 'web-recipe-456',
  name: 'Avocado Toast with Egg',
  description: 'A nutritious and filling breakfast option',
  prep_time: 10,
  cook_time: 5,
  servings: 1,
  difficulty: 'easy',
  tags: ['breakfast', 'high-protein', 'vegetarian'],
  image_url: 'https://via.placeholder.com/300x300.png?text=Avocado+Toast',
  nutrition: {
    calories: 320,
    protein_g: 14,
    carbs_g: 28,
    fat_g: 18,
    fiber_g: 7
  },
  ingredients: [
    '1 slice whole grain bread',
    '1/2 ripe avocado',
    '1 large egg',
    'Salt and pepper to taste'
  ],
  instructions: [
    'Toast the bread until golden brown',
    'Mash the avocado and spread on toast',
    'Fry the egg to desired doneness',
    'Place egg on avocado toast, season, and serve'
  ]
};

// Mock HealthKit data for web testing
export const mockHealthData = {
  weight: 70.5, // kg
  height: 175, // cm  
  activityEnergy: 420, // kcal
  steps: 8500,
  age: 28,
  biologicalSex: 'male' as const
};

// Mock subscription data for web testing
export const mockSubscriptionData = {
  active: true,
  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  productIdentifier: 'mealscanner_pro_annual',
  willRenew: true
};

// Mock async storage data for web testing
export const mockAsyncStorage = {
  scanCount: 5,
  scanDate: '2026-02-09',
  nutritionGoals: {
    dailyTargets: {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 67
    }
  }
};