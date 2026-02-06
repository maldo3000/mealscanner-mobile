import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getLLMRouter } from '../_shared/llm/router.ts'
import type { ChatMessage, LLMConfig } from '../_shared/llm/types.ts'
import { verifyAuth, createUnauthorizedResponse, validateUserMatch } from '../_shared/auth.ts'
import { AnalyzeMealMultiRequestSchema, validateRequest, createValidationErrorResponse } from '../_shared/validation.ts'
import { getSmartCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { checkRateLimit, getRateLimitIdentifier, createRateLimitResponse, RateLimitPresets, addRateLimitHeaders } from '../_shared/rateLimit.ts'
import { ipBlocklistMiddleware } from '../_shared/ipBlocklist.ts'

export interface MealMultiItemInput {
  itemType: 'photo' | 'text' | 'verified'
  imageUrl?: string
  text?: string
  verifiedNutrition?: {
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    sodium?: number
    ingredients?: string
  }
  quantity: number
  orderIndex: number
  isHero: boolean
}

export interface AnalyzeMealMultiRequest {
  userId: string
  mealId?: string
  contextText?: string
  items: MealMultiItemInput[]
  isPro?: boolean
  llm?: LLMConfig
}

interface NutritionPerUnit {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar?: number
  sodium?: number
  cholesterol?: number
}

interface MealRecommendation {
  type: string
  content: string
  priority: number
}

interface AnalyzeMealMultiLLMResponse {
  meal: {
    name: string
    description: string
    serving_size: string
    health_score: number
    feedback: string
    recommendations: MealRecommendation[]
  }
  items: Array<{
    index: number
    name: string
    visual_analysis: string
    estimated_weight_g: number
    nutrition_per_unit: NutritionPerUnit
    ingredients?: string[]
    confidence?: number
    needs_review?: boolean
  }>
}

function toMealHealthCategory(score: number): 'very_healthy' | 'healthy' | 'needs_improvement' {
  if (score > 7) return 'very_healthy'
  if (score > 4) return 'healthy'
  return 'needs_improvement'
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Aggressively parse a numeric value from any input (handles strings like "45g", "120 kcal", etc.)
 */
function parseNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    // Remove any non-numeric characters except period and minus
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Case-insensitive key lookup for nutrition objects
 */
function getNutritionValue(obj: Record<string, unknown> | null | undefined, ...keys: string[]): number {
  if (!obj || typeof obj !== 'object') return 0;
  
  // Create a lowercase key map for case-insensitive lookup
  const lowerKeyMap = new Map<string, unknown>();
  for (const [key, val] of Object.entries(obj)) {
    lowerKeyMap.set(key.toLowerCase(), val);
  }
  
  // Try each key in order
  for (const key of keys) {
    const val = lowerKeyMap.get(key.toLowerCase());
    if (val !== undefined && val !== null) {
      return parseNumeric(val);
    }
  }
  
  return 0;
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1
  return Math.max(1, Math.floor(quantity))
}

function stripMarkdown(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim()
}

function buildInitialMealDescription(items: MealMultiItemInput[]): string {
  const textItems = items.filter((i) => i.itemType === 'text' && typeof i.text === 'string' && i.text.trim().length > 0)
  if (textItems.length > 0) {
    return textItems[0]!.text!.trim()
  }
  return items.length > 1 ? `Meal (${items.length} items)` : 'Analyzed meal'
}

function pickHeroIndex(items: MealMultiItemInput[]): number | null {
  const heroCandidate = items.findIndex((i) => i.itemType === 'photo' && i.isHero)
  if (heroCandidate >= 0) return heroCandidate
  const firstPhoto = items.findIndex((i) => i.itemType === 'photo')
  return firstPhoto >= 0 ? firstPhoto : null
}

function buildUserPrompt(params: {
  contextText?: string
  items: MealMultiItemInput[]
  userGoals?: Record<string, unknown> | null
  isPro?: boolean
}): string {
  const { contextText, items, userGoals, isPro } = params

  const textItemsDescription = items
    .map((item, index) => {
      if (item.itemType !== 'text') return null
      const text = item.text?.trim() ?? ''
      return `Text item ${index} (quantity ${item.quantity}): "${text}"`
    })
    .filter((x): x is string => typeof x === 'string')
    .join('\n')

  const photosDescription = items
    .map((item, index) => {
      if (item.itemType !== 'photo') return null
      return `Photo item ${index} (quantity ${item.quantity}): see attached image`
    })
    .filter((x): x is string => typeof x === 'string')
    .join('\n')

  // For verified items, send only name and ingredients for context (macros are already stored in DB)
  const verifiedDescription = items
    .map((item, index) => {
      if (item.itemType !== 'verified' || !item.verifiedNutrition) return null
      const n = item.verifiedNutrition
      return `Verified item ${index} (quantity ${item.quantity}): "${n.name}"${n.ingredients ? ` (Ingredients: ${n.ingredients})` : ''} — I already have exact nutrition data for this item.`
    })
    .filter((x): x is string => typeof x === 'string')
    .join('\n')

  const tierRules = isPro 
    ? `- ANALYSIS DEPTH: Provide Basic Macros + Micronutrients (Calories, Protein, Carbs, Fat, Fiber, Sugar, Sodium, Cholesterol).
- CRITICAL: You MUST provide non-zero estimates for Sodium (mg) and Cholesterol (mg) for items like meat, dairy, and processed foods. 
- FEEDBACK: Provide a detailed qualitative health assessment and health_score.
- RECOMMENDATIONS: Provide 2-3 actionable nutrition tips.`
    : `- ANALYSIS DEPTH: Provide Basic Macros (Calories, Protein, Carbs, Fat).
- CRITICAL: Even if you set Fiber/Sugar to 0 for a free user, you MUST still provide an accurate total "carbs" value for the item. Do not zero out "carbs" if the food contains carbohydrates (like fries, bread, etc).
- FEEDBACK: Provide a very short 1-sentence summary only.
- RECOMMENDATIONS: Return an empty array [].`

  return `
You are a professional nutritionist. Analyze a meal that is composed of multiple items (photos, text, or verified items).

Important rules:
- INDEXING: Use the provided "Photo item X" or "Text item X" index for each item. 
- MULTIPLE ITEMS IN ONE PHOTO: If a single photo contains multiple distinct food components (e.g., a plate with chicken, rice, and broccoli), you should list them as separate objects in the "items" array, but ALL of them must use the SAME "index" provided for that photo.
- For 'verified' items, use them ONLY for context; do NOT include them in your "items" array response.
- For photo and text items, follow this Chain of Thought (Volume First) process:
  1. IDENTIFY: Precisely identify the food item.
  2. SPATIAL REFERENCE: Compare the item's size to reference objects in the photo (e.g., standard 10-inch plate, fork, glass, or the user's hand).
  3. VOLUME: Estimate the physical volume (e.g., "roughly 1.5 cups" or "200ml").
  4. WEIGHT: Estimate the physical weight in grams based on density.
  5. CALCULATE: Only after estimating weight, calculate the nutrition values.
${tierRules}
- Quantity is an integer multiplier for the entire item.
- If an item seems to have 0 calories but is clearly food, set "needs_review": true.
- Return strict JSON only.

Overall meal context:
${contextText ? `"${contextText}"` : 'None provided'}

User goals:
${userGoals ? JSON.stringify(userGoals) : 'None'}

Items:
${textItemsDescription || '(no text items)'}
${photosDescription || '(no photo items)'}
${verifiedDescription || '(no verified items)'}

Return JSON with this schema:
{
  "meal": {
    "name": "<descriptive title, 40-60 chars>",
    "description": "<detailed description including all items>",
    "serving_size": "<overall serving size estimate>",
    "health_score": <1-10>,
    "feedback": "<qualitative assessment>",
    "recommendations": [
      { "type": "nutrition|portion|timing|alternative", "content": "<text>", "priority": <1-3> }
    ]
  },
  "items": [
    {
      "index": <item index number>,
      "name": "<short name for the item>",
      "visual_analysis": "<step-by-step reasoning: identification -> size relative to scale -> volume -> gram conversion>",
      "estimated_weight_g": <number>,
      "nutrition_per_unit": {
        "calories": <number>,
        "protein": <number>,
        "carbs": <number>,
        "fat": <number>,
        "fiber": <number>,
        "sugar": <number>,
        "sodium": <number>,
        "cholesterol": <number>
      },
      "ingredients": ["<ingredient>", "..."],
      "confidence": <0-1>,
      "needs_review": <boolean>
    }
  ]
}
`.trim()
}

function normalizeLLMResponse(raw: AnalyzeMealMultiLLMResponse, itemCount: number, isPro: boolean): AnalyzeMealMultiLLMResponse {
  const normalizedMeal = {
    name: typeof raw.meal?.name === 'string' ? raw.meal.name : 'Meal',
    description: typeof raw.meal?.description === 'string' ? raw.meal.description : '',
    serving_size: typeof raw.meal?.serving_size === 'string' ? raw.meal.serving_size : 'Medium portion',
    health_score: clampNumber(typeof raw.meal?.health_score === 'number' ? raw.meal.health_score : 5, 1, 10),
    feedback: typeof raw.meal?.feedback === 'string' ? raw.meal.feedback : '',
    recommendations: Array.isArray(raw.meal?.recommendations) ? raw.meal.recommendations : [],
  }

  const rawItems = Array.isArray(raw.items) ? raw.items : []
  
  // Use a map to accumulate nutrition for each valid index
  const accumulator = new Map<number, {
    name: string[];
    visual_analysis: string[];
    weight: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    ingredients: Set<string>;
    needs_review: boolean;
  }>();

  for (const it of rawItems) {
    let idx = Number(it?.index);
    
    // HEURISTIC: If AI hallucinations an index out of bounds, 
    // and we only have 1 item total, force it to 0.
    // If we have multiple, force it to the closest valid index.
    if (!Number.isFinite(idx) || idx < 0 || idx >= itemCount) {
      console.log(`⚠️ AI returned out-of-bounds index ${it.index} for item "${it.name}". Remapping to valid range.`);
      idx = itemCount === 1 ? 0 : Math.min(Math.max(0, idx), itemCount - 1);
    }

    const n = it.nutrition_per_unit as unknown as Record<string, unknown> | null | undefined
    const calories = getNutritionValue(n, 'calories', 'cals', 'kcal', 'energy');
    const protein = getNutritionValue(n, 'protein', 'proteins', 'prot');
    const fat = getNutritionValue(n, 'fat', 'fats', 'lipids', 'total_fat');
    const rawCarbs = getNutritionValue(n, 'carbs', 'carbohydrates', 'carbohydrate', 'carb', 'total_carbs', 'total_carbohydrates');
    const fiber = getNutritionValue(n, 'fiber', 'fibre', 'dietary_fiber');
    const sugar = getNutritionValue(n, 'sugar', 'sugars', 'total_sugar', 'total_sugars', 'added_sugar');
    const sodium = getNutritionValue(n, 'sodium', 'salt', 'na', 'sodium_mg');
    const cholesterol = getNutritionValue(n, 'cholesterol', 'chol', 'cholesterol_mg');

    // Debug log to see what we found for this specific sub-item
    console.log(`📊 Sub-item "${it.name}" (index ${it.index} -> ${idx}) parsed nutrition:`, {
      cal: calories,
      pro: protein,
      fat: fat,
      carbs: rawCarbs,
      fiber: fiber,
      sugar: sugar,
      sodium: sodium,
      chol: cholesterol
    });

    const nameStr = (it.name || '').toLowerCase();
    const isWaterOrSpice = nameStr.includes('water') || nameStr.includes('spice') || nameStr.includes('salt') || nameStr.includes('pepper') || nameStr.includes('diet');
    const highCarbKeywords = ['fry', 'fries', 'potato', 'bread', 'rice', 'pasta', 'stuffing', 'bun', 'wrap', 'dough'];
    const isHighCarbItem = highCarbKeywords.some(k => nameStr.includes(k));
    
    const isSuspectZero = (calories === 0 && nameStr.length > 2 && !isWaterOrSpice) || 
                         (isHighCarbItem && rawCarbs === 0 && nameStr.length > 2);
    
    const needsReview = isSuspectZero || it.needs_review || false;

    const rawWeight = it.estimated_weight_g;
    const weightG = typeof rawWeight === 'number' 
      ? rawWeight 
      : parseInt(String(rawWeight).replace(/[^0-9.]/g, '')) || 0;

    // Get or create bucket for this index
    if (!accumulator.has(idx)) {
      accumulator.set(idx, {
        name: [],
        visual_analysis: [],
        weight: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        cholesterol: 0,
        ingredients: new Set<string>(),
        needs_review: false
      });
    }

    const bucket = accumulator.get(idx)!;
    bucket.name.push(it.name || 'Unknown');
    if (it.visual_analysis) bucket.visual_analysis.push(it.visual_analysis);
    bucket.weight += weightG;
    bucket.calories += calories;
    bucket.protein += protein;
    bucket.carbs += rawCarbs;
    bucket.fat += fat;
    bucket.fiber += fiber;
    bucket.sugar += sugar;
    bucket.sodium += sodium;
    bucket.cholesterol += cholesterol;
    bucket.needs_review = bucket.needs_review || needsReview;
    if (Array.isArray(it.ingredients)) {
      it.ingredients.forEach(i => bucket.ingredients.add(String(i)));
    }
  }

  // Convert accumulator back to the expected array format
  const normalizedItems: AnalyzeMealMultiLLMResponse['items'] = [];
  for (let i = 0; i < itemCount; i++) {
    const data = accumulator.get(i);
    if (!data) {
      // If AI missed an item entirely, provide a fallback
      normalizedItems.push({
        index: i,
        name: `Item ${i}`,
        visual_analysis: 'No analysis provided for this item.',
        estimated_weight_g: 0,
        nutrition_per_unit: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        ingredients: [],
        needs_review: true
      });
      continue;
    }

    const nutrition: NutritionPerUnit = {
      calories: clampNumber(Math.round(data.calories), 0, 10000),
      protein: clampNumber(Number(data.protein.toFixed(1)), 0, 1000),
      carbs: clampNumber(Number(data.carbs.toFixed(1)), 0, 2000),
      fat: clampNumber(Number(data.fat.toFixed(1)), 0, 1000),
      fiber: isPro ? clampNumber(Number(data.fiber.toFixed(1)), 0, 500) : 0,
      sugar: isPro ? clampNumber(Number(data.sugar.toFixed(1)), 0, 1000) : undefined,
      sodium: isPro ? clampNumber(Math.round(data.sodium), 0, 20000) : undefined,
      cholesterol: isPro ? clampNumber(Math.round(data.cholesterol), 0, 5000) : undefined,
    };

    console.log(`✅ Final normalized item ${i}: "${data.name.join(', ')}"`, {
      isPro,
      nutrition
    });

    normalizedItems.push({
      index: i,
      name: data.name.join(', '),
      visual_analysis: data.visual_analysis.join(' | '),
      estimated_weight_g: Math.round(data.weight),
      nutrition_per_unit: nutrition,
      ingredients: Array.from(data.ingredients),
      needs_review: data.needs_review,
      confidence: 0.9 // Aggregate confidence
    });
  }

  return {
    meal: normalizedMeal,
    items: normalizedItems,
  }
}

export async function handleAnalyzeMealMulti(req: Request): Promise<Response> {
  // Get request-aware CORS headers
  const corsHeaders = getSmartCorsHeaders(req)
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const startTime = Date.now()

  let activeMealId: string | undefined

  try {
    // Check IP blocklist first (before any processing)
    const blockedResponse = await ipBlocklistMiddleware(req, corsHeaders, true)
    if (blockedResponse) {
      return blockedResponse
    }
    
    // Verify JWT authentication
    const auth = await verifyAuth(req)
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders)
    }
    const authenticatedUserId = auth.userId
    
    // Check rate limit for AI analysis (expensive operation)
    const rateLimitId = getRateLimitIdentifier(req, authenticatedUserId)
    const rateLimitResult = await checkRateLimit(rateLimitId, RateLimitPresets.aiAnalysis)
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders)
    }

    const rawPayload = await req.json()
    
    // Validate request payload with Zod schema
    const validationResult = validateRequest(AnalyzeMealMultiRequestSchema, rawPayload)
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, corsHeaders)
    }
    
    const payload = validationResult.data!
    const { userId: payloadUserId, mealId, contextText, llm } = payload
    
    // Use authenticated user ID, but validate if payload also specifies one
    if (payloadUserId && !validateUserMatch(authenticatedUserId, payloadUserId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID mismatch: you can only access your own data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    const userId = authenticatedUserId
    activeMealId = mealId
    const rawItems = payload.items

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // 1. Backend Pro Gating: Fetch actual subscription status from DB (don't trust the payload)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'premium';

    // LOUD DEBUG LOG: Verify Pro status in backend
    console.log('*****************************************');
    console.log(`👤 USER ID: ${userId}`);
    console.log(`👤 DB TIER: "${profile?.subscription_tier || 'none'}"`);
    console.log(`👤 TREATED AS PRO: ${isPro ? '✅ YES' : '❌ NO'}`);
    console.log('*****************************************');

    // 2. Extra Security: Check daily scan limit for free users on the backend
    if (!isPro) {
      const hasAIItems = rawItems.some((item: any) => item.itemType === 'photo' || item.itemType === 'text');
      if (hasAIItems) {
        const today = new Date().toISOString().split('T')[0];
        const { count, error: countError } = await supabase
          .from('meals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', today);

        if (countError) {
          console.error('❌ Error checking scan limit:', countError);
        } else if (count !== null && count >= 25) {
          return new Response(
            JSON.stringify({ success: false, error: 'Daily scan limit reached. Upgrade to Pro for unlimited scans!' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
      }
    }

    // Normalize and validate items
    const items: MealMultiItemInput[] = rawItems
      .map((item): MealMultiItemInput => ({
        itemType: item.itemType,
        imageUrl: item.imageUrl,
        text: item.text,
        quantity: normalizeQuantity(item.quantity),
        orderIndex: Number.isFinite(item.orderIndex) ? Math.max(0, Math.floor(item.orderIndex)) : 0,
        isHero: Boolean(item.isHero),
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex)

    const photoCount = items.filter((i) => i.itemType === 'photo').length
    if (photoCount > 4) {
      return new Response(
        JSON.stringify({ success: false, error: 'You can upload up to 4 photos per meal.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    for (const item of items) {
      if (item.itemType === 'photo') {
        if (!item.imageUrl || typeof item.imageUrl !== 'string') {
          return new Response(
            JSON.stringify({ success: false, error: 'Photo items must include imageUrl.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      } else if (item.itemType === 'text') {
        if (!item.text || typeof item.text !== 'string' || item.text.trim().length < 2) {
          return new Response(
            JSON.stringify({ success: false, error: 'Text items must include non-empty text.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      } else if (item.itemType === 'verified') {
        if (!item.verifiedNutrition) {
          return new Response(
            JSON.stringify({ success: false, error: 'Verified items must include verifiedNutrition.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid itemType. Must be photo, text, or verified.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    const heroIndex = pickHeroIndex(items)
    const normalizedItemsWithHero: MealMultiItemInput[] = items.map((item, idx) => ({
      ...item,
      isHero: heroIndex !== null && idx === heroIndex,
    }))

    // Verify/update or create meal
    let finalMealId: string | undefined = mealId
    let existingMealDescription: string | null = null

    if (finalMealId) {
      const { data: existingMeal, error: mealFetchError } = await supabase
        .from('meals')
        .select('id, user_id, description')
        .eq('id', finalMealId)
        .single()

      if (mealFetchError || !existingMeal) {
        return new Response(
          JSON.stringify({ success: false, error: 'Meal not found.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      if (existingMeal.user_id !== userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Not authorized to modify this meal.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      existingMealDescription = existingMeal.description ?? null

      await supabase
        .from('meals')
        .update({ context_text: contextText ?? null, processing_status: 'processing' })
        .eq('id', finalMealId)
    } else {
      const initialDescription = buildInitialMealDescription(normalizedItemsWithHero)
      const { data: newMeal, error: createMealError } = await supabase
        .from('meals')
        .insert({
          user_id: userId,
          description: initialDescription,
          context_text: contextText ?? null,
          processing_status: 'processing',
        })
        .select()
        .single()

      if (createMealError || !newMeal) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create meal.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      finalMealId = newMeal.id
      activeMealId = newMeal.id
      existingMealDescription = newMeal.description ?? null
    }

    if (!finalMealId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to resolve mealId.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Replace meal_items to match payload (simplifies reanalyze + supports later expansion)
    await supabase.from('meal_items').delete().eq('meal_id', finalMealId)

    const mealItemsToInsert = normalizedItemsWithHero.map((item, index) => ({
      meal_id: finalMealId,
      item_type: item.itemType === 'verified' ? 'text' : item.itemType,
      image_url: item.itemType === 'photo' ? item.imageUrl : null,
      text: item.itemType === 'verified' ? item.verifiedNutrition?.name : (item.itemType === 'text' ? item.text?.trim() : null),
      quantity: item.quantity,
      order_index: index,
      is_hero: item.itemType === 'photo' ? item.isHero : false,
      ai_nutrition_per_unit: item.itemType === 'verified' ? {
        calories: item.verifiedNutrition?.calories || 0,
        protein: item.verifiedNutrition?.protein || 0,
        carbs: item.verifiedNutrition?.carbs || 0,
        fat: item.verifiedNutrition?.fat || 0,
        fiber: item.verifiedNutrition?.fiber || 0,
        sodium: item.verifiedNutrition?.sodium || 0,
      } : null,
      ai_confidence: item.itemType === 'verified' ? 1.0 : null,
    }))

    const { error: insertItemsError } = await supabase.from('meal_items').insert(mealItemsToInsert)
    if (insertItemsError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save meal items.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Fetch inserted items for updates
    const { data: savedMealItems, error: fetchItemsError } = await supabase
      .from('meal_items')
      .select('id, order_index, item_type')
      .eq('meal_id', finalMealId)
      .order('order_index', { ascending: true })

    if (fetchItemsError || !savedMealItems) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to load saved meal items.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Enforce hero (use RPC to avoid unique-index conflicts)
    if (heroIndex !== null) {
      const heroRow = savedMealItems.find((r: any) => r.order_index === heroIndex && r.item_type === 'photo')
      if (heroRow?.id) {
        await supabase.rpc('set_meal_hero_item', { p_meal_id: finalMealId, p_meal_item_id: heroRow.id })
      }
    }

    // Fetch user goals for personalization
    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const systemPrompt =
      'You are a professional nutritionist with expertise in meal analysis. You will receive multiple meal items (photos and text entries).'

    const userPrompt = buildUserPrompt({ contextText, items: normalizedItemsWithHero, userGoals: userGoals ?? null, isPro })

    const content: NonNullable<ChatMessage['content']> = [{ type: 'text', text: userPrompt }]
    normalizedItemsWithHero.forEach((item, index) => {
      if (item.itemType === 'photo' && item.imageUrl) {
        content.push({ type: 'text', text: `Photo item ${index} (quantity ${item.quantity})` })
        content.push({ type: 'image_url', image_url: { url: item.imageUrl, detail: 'high' } })
      }
    })

    const llmRouter = getLLMRouter()
    console.log('⏳ Sending request to LLM...')
    let chatResponse;
    try {
      chatResponse = await llmRouter.chatComplete(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content },
          ],
          max_tokens: 2000,
          temperature: 0.3,
          response_format: { type: 'json_object' },
        },
        llm
      )
    } catch (llmError) {
      console.error('❌ LLM Router Error:', llmError)
      throw new Error(`AI Analysis failed: ${llmError instanceof Error ? llmError.message : 'Unknown AI error'}`)
    }
    console.log('✅ LLM response received.')

    const analysisTextRaw = chatResponse.content
    const analysisText = stripMarkdown(analysisTextRaw)
    const openaiData = {
      model: chatResponse.model,
      choices: [{ message: { content: analysisTextRaw } }],
      usage: chatResponse.usage,
    }

    let analysis: AnalyzeMealMultiLLMResponse
    try {
      analysis = JSON.parse(analysisText) as AnalyzeMealMultiLLMResponse
    } catch (err) {
      console.error('❌ Failed to parse AI response:', err)
      console.log('Raw response:', analysisTextRaw)
      analysis = {
        meal: {
          name: buildInitialMealDescription(normalizedItemsWithHero),
          description: contextText || 'Meal analysis completed with estimates.',
          serving_size: 'Medium portion',
          health_score: 5,
          feedback: 'Analysis completed. Macros are estimated based on visual identification.',
          recommendations: [],
        },
        items: normalizedItemsWithHero.map((item, idx) => ({
          index: idx,
          name: item.text || (item.itemType === 'photo' ? 'Food item' : `Item ${idx}`),
          visual_analysis: 'Fallback analysis due to parsing error.',
          estimated_weight_g: 0,
          nutrition_per_unit: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          ingredients: [],
          confidence: 0.5,
        })),
      }
    }

    // Debug: Log raw AI indices before normalization
    console.log(`🔍 Raw AI items count: ${analysis.items?.length || 0}`)
    analysis.items?.forEach((it: any) => {
      console.log(`🔍 Raw item index: ${it.index} (type: ${typeof it.index}), name: ${it.name}, carbs: ${it.nutrition_per_unit?.carbs} (type: ${typeof it.nutrition_per_unit?.carbs})`)
    })
    
    const normalized = normalizeLLMResponse(analysis, normalizedItemsWithHero.length, isPro)

    // Clean up generic names/placeholders
    if (
      normalized.meal.name.includes('<Generate') ||
      normalized.meal.name === 'Meal' ||
      normalized.meal.name === 'Analyzed meal' ||
      normalized.meal.name === 'Analyzed Snack' ||
      normalized.meal.name.includes('item)') ||
      normalized.meal.name.includes('items)')
    ) {
      // Use the first identifiable item name
      const firstValidItem = normalized.items.find((it) => it.name && !it.name.includes('Item') && it.name !== 'Food item');
      if (firstValidItem) {
        normalized.meal.name = firstValidItem.name;
      } else {
        normalized.meal.name = buildInitialMealDescription(normalizedItemsWithHero);
      }
    }

    // Save analysis_results record
    const processingTime = Date.now() - startTime
    const { data: analysisRecord } = await supabase
      .from('analysis_results')
      .insert({
        meal_id: finalMealId,
        analysis_type: 'combined',
        raw_response: openaiData,
        extracted_nutrition: normalized,
        processing_time_ms: processingTime,
      })
      .select()
      .single()

    // Replace recommendations for this meal
    await supabase.from('recommendations').delete().eq('meal_id', finalMealId)
    if (normalized.meal.recommendations.length > 0) {
      const recRows = normalized.meal.recommendations.map((rec) => ({
        user_id: userId,
        meal_id: finalMealId,
        recommendation_type: rec.type,
        content: rec.content,
        priority: rec.priority || 1,
      }))
      await supabase.from('recommendations').insert(recRows)
    }

    // Update per-item nutrition per unit (skip verified items - their data was set during insert)
    const itemsByIndex = new Map<number, AnalyzeMealMultiLLMResponse['items'][number]>()
    normalized.items.forEach((it) => itemsByIndex.set(Number(it.index), it))  // Force number key
    
    // Debug: Log the mapping
    console.log(`📋 Normalized ${normalized.items.length} items from AI. Map keys:`, Array.from(itemsByIndex.keys()))
    console.log(`📋 DB rows order_indexes:`, savedMealItems.map((r: any) => r.order_index))

    const updatePromises = savedMealItems.map((row: any) => {
      const originalItem = normalizedItemsWithHero[row.order_index]
      if (originalItem?.itemType === 'verified') {
        console.log(`⏭️ Skipping verified item at order_index ${row.order_index}`)
        return Promise.resolve()
      }

      const item = itemsByIndex.get(row.order_index)
      if (!item) {
        console.log(`⚠️ No AI item found for order_index ${row.order_index} - Map has keys: ${Array.from(itemsByIndex.keys())}`)
        return Promise.resolve()
      }
      
      console.log(`✅ Updating item ${row.order_index}: "${item.name}" with carbs=${item.nutrition_per_unit.carbs}`)

      const nutritionPerUnit = item.nutrition_per_unit
      return supabase
        .from('meal_items')
        .update({
          ai_nutrition_per_unit: {
            ...nutritionPerUnit,
            visual_analysis: item.visual_analysis,
            estimated_weight_g: item.estimated_weight_g,
            needs_review: item.needs_review,
          },
          ai_ingredients: item.ingredients ?? [],
          ai_confidence: typeof item.confidence === 'number' ? item.confidence : null,
        })
        .eq('id', row.id)
    })

    console.log(`⏳ Updating ${updatePromises.length} meal items in parallel...`)
    const updateResults = await Promise.all(updatePromises)
    const updateError = updateResults.find((r: any) => r?.error)
    if (updateError) {
      console.error('❌ Error updating meal items:', updateError.error)
      // We continue anyway to try and finalize the meal record
    }
    console.log('✅ Meal items update attempt completed.')

    // Update meal record with summary fields + keep old `ai_analysis.recommendations` shape compatible
    const isSingleTextItem =
      normalizedItemsWithHero.length === 1 && normalizedItemsWithHero[0]?.itemType === 'text' && !!normalizedItemsWithHero[0]?.text

    const finalName = isSingleTextItem
      ? normalizedItemsWithHero[0]!.text!.trim()
      : normalized.meal.name || existingMealDescription || 'Meal'

    console.log(`⏳ Finalizing meal record: ${finalMealId}...`)
    
    // Compute health category string for storage
    const healthCategory = toMealHealthCategory(normalized.meal.health_score)

    // Compute new descriptive nutrition tag
    const totalMacros = normalized.items.reduce((acc, it) => {
      acc.calories += it.nutrition_per_unit.calories;
      acc.protein += it.nutrition_per_unit.protein;
      acc.carbs += it.nutrition_per_unit.carbs;
      acc.fat += it.nutrition_per_unit.fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const calculateNutritionTag = (data: typeof totalMacros) => {
      const { calories, protein, carbs, fat } = data;
      const proteinCals = protein * 4;
      const carbCals = carbs * 4;
      const fatCals = fat * 9;
      const totalCals = Math.max(proteinCals + carbCals + fatCals, calories, 1);

      const pPct = (proteinCals / totalCals) * 100;
      const cPct = (carbCals / totalCals) * 100;
      const fPct = (fatCals / totalCals) * 100;

      if (pPct >= 30 && protein >= 25) return 'Protein-heavy';
      if (calories <= 400 && fPct <= 25) return 'Light';
      if (cPct >= 55 && pPct < 25) return 'Carb-forward';
      if ((calories >= 650 || fPct >= 45) && pPct < 20) return 'Indulgent';
      return 'Balanced';
    };

    const nutritionTag = calculateNutritionTag(totalMacros);
    
    // Build update payload - health_score excluded from main update since DB enum may differ
    // Store health info in ai_analysis instead
    const { error: finalizeError } = await supabase
      .from('meals')
      .update({
        description: finalName,
        serving_estimate: normalized.meal.serving_size,
        qualitative_feedback: normalized.meal.feedback,
        ai_analysis: {
          name: finalName,
          description: normalized.meal.description,
          feedback: normalized.meal.feedback,
          recommendations: normalized.meal.recommendations,
          items: normalized.items,
          health_score: normalized.meal.health_score,
          health_category: healthCategory,
          nutrition_tag: nutritionTag,
        },
        analysis_version: 'multi-1.2',
        processing_status: 'completed',
      })
      .eq('id', finalMealId)

    if (finalizeError) {
      console.error('❌ Error finalizing meal:', finalizeError)
      throw new Error(`Failed to finalize meal record: ${finalizeError.message}`)
    }
    console.log('✅ Meal analysis finalized.')

    // Note: totals + hero image_url are maintained by DB triggers (recompute_meal_totals)
    return new Response(
      JSON.stringify({
        success: true,
        meal_id: finalMealId,
        analysis_id: analysisRecord?.id,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Edge Function Error:', message)

    // Attempt to mark as failed in DB if we have a mealId
    if (activeMealId) {
      try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
        await supabase.from('meals').update({ processing_status: 'failed' }).eq('id', activeMealId)
      } catch {
        // Ignore secondary error
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Failed to analyze multi-item meal.', details: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}






