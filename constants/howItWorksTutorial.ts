export interface HowItWorksCardContent {
  id: string
  headline: string
  body: string
  tipLine?: string
  examples?: string[]
  visual: 'welcome' | 'fourWays' | 'photo' | 'context' | 'describe' | 'database' | 'recipes' | 'accuracy'
}

export const HOW_IT_WORKS_CARDS: HowItWorksCardContent[] = [
  {
    id: 'welcome',
    visual: 'welcome',
    headline: 'Meet MealScanner',
    body: 'Log meals in seconds, get calories and macros, then refine results with a quick note when needed.',
  },
  {
    id: 'four-ways',
    visual: 'fourWays',
    headline: 'Log meals four ways',
    body: 'Snap a photo, describe it by voice or text, log from the food database, or pick from our recipes.',
  },
  {
    id: 'photo',
    visual: 'photo',
    headline: 'Photo logging is the fastest',
    body: 'Take a clear photo in good light. Include the full plate and any sides if you can.',
    tipLine: 'One photo is usually enough, but multiple angles can help.',
  },
  {
    id: 'context',
    visual: 'context',
    headline: 'Add context for better accuracy',
    body: 'Photos miss things like cooking oil, sauces, toppings, or items under layers. Add a quick note or speak it out loud to improve the nutrition estimate.',
    examples: ['1 tbsp olive oil', 'creamy dressing on the side', 'cheese under the salad'],
  },
  {
    id: 'describe',
    visual: 'describe',
    headline: 'Describing works great too',
    body: 'If you are not using a photo, be specific: ingredients, portion size, and how it was cooked.',
    examples: ['2 eggs scrambled in butter, 2 slices toast, 1 tbsp jam'],
  },
  {
    id: 'database',
    visual: 'database',
    headline: 'Need precision? Use the database',
    body: 'Log foods from USDA and Open Food Facts when you know measurements and want exact entries.',
  },
  {
    id: 'recipes',
    visual: 'recipes',
    headline: 'Recipes when you want ideas',
    body: 'Browse an ever-growing recipe library to support your goals, then log a meal from the recipe in one tap.',
  },
  {
    id: 'accuracy',
    visual: 'accuracy',
    headline: 'AI estimates are approximations',
    body: 'Photo logging is magical but not always perfect. Results are best-guess estimates of calories and nutrition.',
    tipLine: 'The more context you add (like "cooked in butter" or "large portion"), the better the accuracy.',
  },
]
