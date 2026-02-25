import {
  buildDatabaseFoodItem,
  type DatabaseFoodItem,
  type ServingOption,
} from '@/components/capture/types';

const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const OFF_BASE_URL = 'https://world.openfoodfacts.org/cgi';

const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL = 5 * 60 * 1000;
const searchCache = new Map<string, { data: DatabaseFoodItem[]; timestamp: number }>();

function getCached(query: string): DatabaseFoodItem[] | null {
  const key = query.trim().toLowerCase();
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  if (entry) searchCache.delete(key);
  return null;
}

function setCache(query: string, data: DatabaseFoodItem[]): void {
  searchCache.set(query.trim().toLowerCase(), { data, timestamp: Date.now() });
}

export interface SearchResults {
  items: DatabaseFoodItem[];
  source: 'usda' | 'off' | 'both';
}

function parseGramsFromLabel(label: string | undefined): number | null {
  if (!label) return null;
  const match = label.match(/([\d.]+)\s*(g|ml)/i);
  return match ? parseFloat(match[1]) : null;
}

function normalizeUSDAItem(item: any): DatabaseFoodItem {
  const getNutrient = (name: string) => {
    const nutrient = item.foodNutrients?.find((n: any) =>
      n.nutrientName?.toLowerCase().includes(name.toLowerCase()) ||
      n.name?.toLowerCase().includes(name.toLowerCase())
    );
    return nutrient?.value || 0;
  };

  const caloriesPer100g = getNutrient('Energy');
  const proteinPer100g = getNutrient('Protein');
  const carbsPer100g = getNutrient('Carbohydrate');
  const fatPer100g = getNutrient('Total lipid');
  const fiberPer100g = getNutrient('Fiber') || undefined;
  const sodiumPer100g = getNutrient('Sodium, Na') || undefined;

  const servings: ServingOption[] = [];

  const apiServingSize = item.servingSize ? parseFloat(item.servingSize) : null;
  const householdText = item.householdServingFullText as string | undefined;

  if (apiServingSize && apiServingSize !== 100) {
    servings.push({
      label: householdText || `${apiServingSize}g`,
      grams: apiServingSize,
      isDefault: true,
    });
  } else if (householdText) {
    const gramsFromLabel = parseGramsFromLabel(householdText);
    servings.push({
      label: householdText,
      grams: gramsFromLabel || 100,
      isDefault: true,
    });
  }

  if (Array.isArray(item.foodPortions)) {
    for (const portion of item.foodPortions) {
      const portionGrams = portion.gramWeight;
      const portionLabel =
        portion.modifier || portion.measureUnitName || portion.portionDescription;
      if (portionGrams && portionLabel) {
        const alreadyAdded = servings.some(
          s => Math.abs(s.grams - portionGrams) < 1
        );
        if (!alreadyAdded) {
          servings.push({
            label: `${portionLabel} (${Math.round(portionGrams)}g)`,
            grams: portionGrams,
            isDefault: servings.length === 0,
          });
        }
      }
    }
  }

  if (!servings.some(s => s.grams === 100)) {
    servings.push({ label: '100g', grams: 100, isDefault: servings.length === 0 });
  }

  return buildDatabaseFoodItem({
    id: `usda-${item.fdcId}`,
    name: item.description,
    brand: item.brandOwner || item.brandName,
    source: 'usda',
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    sodiumPer100g,
    ingredients: item.ingredients,
    servings,
    barcode: undefined,
    imageUrl: undefined,
  });
}

function normalizeOFFItem(item: any): DatabaseFoodItem {
  const nutrients = item.nutriments || {};

  const caloriesPer100g = nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0;
  const proteinPer100g = nutrients.proteins_100g || nutrients.proteins || 0;
  const carbsPer100g = nutrients.carbohydrates_100g || nutrients.carbohydrates || 0;
  const fatPer100g = nutrients.fat_100g || nutrients.fat || 0;
  const fiberPer100g = nutrients.fiber_100g || nutrients.fiber || undefined;
  const sodiumPer100g = nutrients.sodium_100g || nutrients.sodium || undefined;

  const servings: ServingOption[] = [];

  const servingQuantity = parseFloat(item.serving_quantity) || null;
  const servingSizeLabel = item.serving_size as string | undefined;

  if (servingQuantity && servingQuantity !== 100) {
    servings.push({
      label: servingSizeLabel || `${servingQuantity}g`,
      grams: servingQuantity,
      isDefault: true,
    });
  } else if (servingSizeLabel) {
    const gramsFromLabel = parseGramsFromLabel(servingSizeLabel);
    if (gramsFromLabel && gramsFromLabel !== 100) {
      servings.push({
        label: servingSizeLabel,
        grams: gramsFromLabel,
        isDefault: true,
      });
    }
  }

  if (!servings.some(s => s.grams === 100)) {
    servings.push({ label: '100g', grams: 100, isDefault: servings.length === 0 });
  }

  return buildDatabaseFoodItem({
    id: `off-${item.code || item._id}`,
    name: item.product_name || 'Unknown Product',
    brand: item.brands,
    source: 'off',
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    sodiumPer100g,
    ingredients: item.ingredients_text,
    servings,
    barcode: item.code,
    imageUrl: item.image_url,
  });
}

function fetchWithTimeout(
  url: string,
  externalSignal?: AbortSignal,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();

  if (externalSignal?.aborted) {
    controller.abort();
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  });
}

async function searchUSDA(query: string, signal?: AbortSignal): Promise<DatabaseFoodItem[]> {
  try {
    const response = await fetchWithTimeout(
      `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=10`,
      signal
    );
    const data = await response.json();
    return (data.foods || []).map(normalizeUSDAItem);
  } catch (error: any) {
    if (error?.name === 'AbortError') return [];
    console.error('USDA Search Error:', error);
    return [];
  }
}

async function searchOFF(query: string, signal?: AbortSignal): Promise<DatabaseFoodItem[]> {
  try {
    const response = await fetchWithTimeout(
      `${OFF_BASE_URL}/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=5`,
      signal
    );
    const data = await response.json();
    return (data.products || []).map(normalizeOFFItem);
  } catch (error: any) {
    if (error?.name === 'AbortError') return [];
    console.error('OFF Search Error:', error);
    return [];
  }
}

function relevanceScore(item: DatabaseFoodItem, query: string): number {
  const q = query.toLowerCase();
  const name = item.name.toLowerCase();

  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  const wordBoundary = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  if (wordBoundary.test(name)) return 60;
  if (name.includes(q)) return 40;
  // USDA items get a slight boost for standardized data
  if (item.source === 'usda') return 20;
  return 10;
}

function deduplicateAndRank(items: DatabaseFoodItem[], query: string): DatabaseFoodItem[] {
  const seen = new Map<string, DatabaseFoodItem>();

  for (const item of items) {
    const normName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normBrand = (item.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${normName}_${normBrand}`;

    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => relevanceScore(b, query) - relevanceScore(a, query)
  );
}

export interface SearchOptions {
  signal?: AbortSignal;
  onPartialResults?: (items: DatabaseFoodItem[]) => void;
}

export async function searchFoodDatabase(
  query: string,
  options?: SearchOptions
): Promise<DatabaseFoodItem[]> {
  if (!query || query.trim().length < 2) return [];

  const cached = getCached(query);
  if (cached) {
    options?.onPartialResults?.(cached);
    return cached;
  }

  const accumulated: DatabaseFoodItem[] = [];
  const { signal, onPartialResults } = options ?? {};

  const usdaPromise = searchUSDA(query, signal).then(items => {
    if (signal?.aborted) return;
    accumulated.push(...items);
    onPartialResults?.(deduplicateAndRank([...accumulated], query));
  });

  const offPromise = searchOFF(query, signal).then(items => {
    if (signal?.aborted) return;
    accumulated.push(...items);
    onPartialResults?.(deduplicateAndRank([...accumulated], query));
  });

  await Promise.all([usdaPromise, offPromise]);

  if (signal?.aborted) return [];

  const final = deduplicateAndRank(accumulated, query);
  setCache(query, final);
  return final;
}
