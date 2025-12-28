import type { DatabaseFoodItem } from '@/components/capture/types';

const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const OFF_BASE_URL = 'https://world.openfoodfacts.org/cgi';

export interface SearchResults {
  items: DatabaseFoodItem[];
  source: 'usda' | 'off' | 'both';
}

/**
 * Normalizes USDA food item to DatabaseFoodItem
 */
function normalizeUSDAItem(item: any): DatabaseFoodItem {
  // USDA returns nutrient data in an array
  const getNutrient = (name: string) => {
    const nutrient = item.foodNutrients?.find((n: any) => 
      n.nutrientName?.toLowerCase().includes(name.toLowerCase()) ||
      n.name?.toLowerCase().includes(name.toLowerCase())
    );
    return nutrient?.value || 0;
  };

  return {
    id: `usda-${item.fdcId}`,
    name: item.description,
    brand: item.brandOwner || item.brandName,
    source: 'usda',
    calories: getNutrient('Energy'),
    protein: getNutrient('Protein'),
    carbs: getNutrient('Carbohydrate'),
    fat: getNutrient('Total lipid'),
    fiber: getNutrient('Fiber'),
    sodium: getNutrient('Sodium, Na'),
    ingredients: item.ingredients,
    servingSize: item.servingSize || 100,
    servingUnit: item.servingSizeUnit || 'g',
    servingText: item.householdServingFullText,
  };
}

/**
 * Normalizes Open Food Facts item to DatabaseFoodItem
 */
function normalizeOFFItem(item: any): DatabaseFoodItem {
  const nutrients = item.nutriments || {};
  return {
    id: `off-${item.code || item._id}`,
    name: item.product_name || 'Unknown Product',
    brand: item.brands,
    source: 'off',
    calories: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0,
    protein: nutrients.proteins_100g || nutrients.proteins || 0,
    carbs: nutrients.carbohydrates_100g || nutrients.carbohydrates || 0,
    fat: nutrients.fat_100g || nutrients.fat || 0,
    fiber: nutrients.fiber_100g || nutrients.fiber || 0,
    sodium: nutrients.sodium_100g || nutrients.sodium || 0,
    ingredients: item.ingredients_text,
    servingSize: 100, // OFF data is usually per 100g
    servingUnit: 'g',
    servingText: item.serving_size,
    barcode: item.code,
    imageUrl: item.image_url,
  };
}

/**
 * Searches USDA FoodData Central
 */
async function searchUSDA(query: string): Promise<DatabaseFoodItem[]> {
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=10`
    );
    const data = await response.json();
    return (data.foods || []).map(normalizeUSDAItem);
  } catch (error) {
    console.error('USDA Search Error:', error);
    return [];
  }
}

/**
 * Searches Open Food Facts
 */
async function searchOFF(query: string): Promise<DatabaseFoodItem[]> {
  try {
    const response = await fetch(
      `${OFF_BASE_URL}/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10`
    );
    const data = await response.json();
    return (data.products || []).map(normalizeOFFItem);
  } catch (error) {
    console.error('OFF Search Error:', error);
    return [];
  }
}

/**
 * Unified search orchestrator
 */
export async function searchFoodDatabase(query: string): Promise<DatabaseFoodItem[]> {
  if (!query || query.trim().length < 2) return [];

  // Run searches in parallel
  const [usdaResults, offResults] = await Promise.all([
    searchUSDA(query),
    searchOFF(query)
  ]);

  // Merge and prioritize
  // For brand-specific queries (detected by length or specific keywords), we might want to prioritize OFF.
  // For now, we'll just merge them, putting USDA first as it's often better for generic items.
  
  const results = [...usdaResults, ...offResults];
  
  // Basic deduplication by name/brand if needed, but IDs are unique.
  return results;
}

