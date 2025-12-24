import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getLLMRouter } from '../_shared/llm/router.ts'
import type { ChatMessage, LLMConfig } from '../_shared/llm/types.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export interface MealMultiItemInput {
  itemType: 'photo' | 'text'
  imageUrl?: string
  text?: string
  quantity: number
  orderIndex: number
  isHero: boolean
}

export interface AnalyzeMealMultiRequest {
  userId: string
  mealId?: string
  contextText?: string
  items: MealMultiItemInput[]
  llm?: LLMConfig
}

interface NutritionPerUnit {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

interface MealRecommendation {
  type: string
  content: string
  priority: number
}

interface AnalyzeMealMultiLLMResponse {
  meal: {
    description: string
    serving_size: string
    health_score: number
    feedback: string
    recommendations: MealRecommendation[]
  }
  items: Array<{
    index: number
    name: string
    nutrition_per_unit: NutritionPerUnit
    ingredients?: string[]
    confidence?: number
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

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1
  return Math.max(1, Math.floor(quantity))
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
}): string {
  const { contextText, items, userGoals } = params

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

  return `
You are a professional nutritionist. Analyze a meal that is composed of multiple items (some are photos, some are text entries).

Important rules:
- Each item should produce *per-unit* nutrition. The client will multiply by quantity.
- Quantity is an integer multiplier for the entire item.
- Return strict JSON only (no markdown).

Overall meal context (applies to the whole set):
${contextText ? `"${contextText}"` : 'None provided'}

User goals (if any):
${userGoals ? JSON.stringify(userGoals) : 'None'}

Items:
${textItemsDescription || '(no text items)'}
${photosDescription || '(no photo items)'}

Return JSON with this schema:
{
  "meal": {
    "description": "<short meal title/summary>",
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
      "nutrition_per_unit": {
        "calories": <number>,
        "protein": <number>,
        "carbs": <number>,
        "fat": <number>,
        "fiber": <number>
      },
      "ingredients": ["<ingredient>", "..."],
      "confidence": <0-1>
    }
  ]
}

Provide specific numeric values as numbers (not strings).`
    .trim()
}

function normalizeLLMResponse(raw: AnalyzeMealMultiLLMResponse, itemCount: number): AnalyzeMealMultiLLMResponse {
  const normalizedMeal = {
    description: typeof raw.meal?.description === 'string' ? raw.meal.description : 'Meal',
    serving_size: typeof raw.meal?.serving_size === 'string' ? raw.meal.serving_size : 'Medium portion',
    health_score: clampNumber(typeof raw.meal?.health_score === 'number' ? raw.meal.health_score : 5, 1, 10),
    feedback: typeof raw.meal?.feedback === 'string' ? raw.meal.feedback : '',
    recommendations: Array.isArray(raw.meal?.recommendations) ? raw.meal.recommendations : [],
  }

  const items = Array.isArray(raw.items) ? raw.items : []
  const normalizedItems = items
    .filter((it) => typeof it?.index === 'number' && it.index >= 0 && it.index < itemCount)
    .map((it) => {
      const n = it.nutrition_per_unit
      const nutrition: NutritionPerUnit = {
        calories: clampNumber(typeof n?.calories === 'number' ? n.calories : 0, 0, 3000),
        protein: clampNumber(typeof n?.protein === 'number' ? n.protein : 0, 0, 300),
        carbs: clampNumber(typeof n?.carbs === 'number' ? n.carbs : 0, 0, 500),
        fat: clampNumber(typeof n?.fat === 'number' ? n.fat : 0, 0, 300),
        fiber: clampNumber(typeof n?.fiber === 'number' ? n.fiber : 0, 0, 100),
      }
      return {
        index: it.index,
        name: typeof it.name === 'string' ? it.name : `Item ${it.index}`,
        nutrition_per_unit: nutrition,
        ingredients: Array.isArray(it.ingredients) ? it.ingredients.filter((x): x is string => typeof x === 'string') : [],
        confidence: typeof it.confidence === 'number' ? clampNumber(it.confidence, 0, 1) : undefined,
      }
    })

  return {
    meal: normalizedMeal,
    items: normalizedItems,
  }
}

export async function handleAnalyzeMealMulti(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const payload: AnalyzeMealMultiRequest = await req.json()
    const { userId, mealId, contextText, llm } = payload
    const rawItems = Array.isArray(payload.items) ? payload.items : []

    if (!userId || rawItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: userId and items[] are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
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
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid itemType. Must be photo or text.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    const heroIndex = pickHeroIndex(items)
    const normalizedItemsWithHero: MealMultiItemInput[] = items.map((item, idx) => ({
      ...item,
      isHero: heroIndex !== null && idx === heroIndex,
    }))

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

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
      item_type: item.itemType,
      image_url: item.itemType === 'photo' ? item.imageUrl : null,
      text: item.itemType === 'text' ? item.text?.trim() : null,
      quantity: item.quantity,
      order_index: index,
      is_hero: item.itemType === 'photo' ? item.isHero : false,
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
      const heroRow = savedMealItems.find((r) => r.order_index === heroIndex && r.item_type === 'photo')
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

    const userPrompt = buildUserPrompt({ contextText, items: normalizedItemsWithHero, userGoals: userGoals ?? null })

    const content: NonNullable<ChatMessage['content']> = [{ type: 'text', text: userPrompt }]
    normalizedItemsWithHero.forEach((item, index) => {
      if (item.itemType === 'photo' && item.imageUrl) {
        content.push({ type: 'text', text: `Photo item ${index} (quantity ${item.quantity})` })
        content.push({ type: 'image_url', image_url: { url: item.imageUrl, detail: 'high' } })
      }
    })

    const llmRouter = getLLMRouter()
    const chatResponse = await llmRouter.chatComplete(
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

    const analysisText = chatResponse.content
    const openaiData = {
      model: chatResponse.model,
      choices: [{ message: { content: analysisText } }],
      usage: chatResponse.usage,
    }

    let analysis: AnalyzeMealMultiLLMResponse
    try {
      analysis = JSON.parse(analysisText) as AnalyzeMealMultiLLMResponse
    } catch {
      analysis = {
        meal: {
          description: existingMealDescription ?? 'Meal',
          serving_size: 'Medium portion',
          health_score: 5,
          feedback: 'Unable to parse analysis. Please try reanalyzing with clearer photos or more details.',
          recommendations: [],
        },
        items: normalizedItemsWithHero.map((_, idx) => ({
          index: idx,
          name: `Item ${idx}`,
          nutrition_per_unit: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          ingredients: [],
          confidence: 0,
        })),
      }
    }

    const normalized = normalizeLLMResponse(analysis, normalizedItemsWithHero.length)

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

    // Update per-item nutrition per unit
    const itemsByIndex = new Map<number, AnalyzeMealMultiLLMResponse['items'][number]>()
    normalized.items.forEach((it) => itemsByIndex.set(it.index, it))

    for (const row of savedMealItems) {
      const item = itemsByIndex.get(row.order_index)
      if (!item) continue

      const nutritionPerUnit = item.nutrition_per_unit
      await supabase
        .from('meal_items')
        .update({
          ai_nutrition_per_unit: nutritionPerUnit,
          ai_ingredients: item.ingredients ?? [],
          ai_confidence: typeof item.confidence === 'number' ? item.confidence : null,
        })
        .eq('id', row.id)
    }

    // Update meal record with summary fields + keep old `ai_analysis.recommendations` shape compatible
    const isSingleTextItem =
      normalizedItemsWithHero.length === 1 && normalizedItemsWithHero[0]?.itemType === 'text' && !!normalizedItemsWithHero[0]?.text

    const finalDescription = isSingleTextItem
      ? normalizedItemsWithHero[0]!.text!.trim()
      : normalized.meal.description || existingMealDescription || 'Meal'

    await supabase
      .from('meals')
      .update({
        description: finalDescription,
        serving_estimate: normalized.meal.serving_size,
        qualitative_feedback: normalized.meal.feedback,
        health_score: toMealHealthCategory(normalized.meal.health_score),
        ai_analysis: {
          feedback: normalized.meal.feedback,
          recommendations: normalized.meal.recommendations,
          items: normalized.items,
        },
        analysis_version: 'multi-1.0',
        processing_status: 'completed',
      })
      .eq('id', finalMealId)

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
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to analyze multi-item meal.', details: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}






