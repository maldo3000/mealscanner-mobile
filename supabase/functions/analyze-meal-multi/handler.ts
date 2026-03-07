import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createUnauthorizedResponse, validateUserMatch, verifyAuth } from '../_shared/auth.ts'
import { getSmartCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { checkDailyUserLimit, createDailyLimitResponse } from '../_shared/dailyLimit.ts'
import { ipBlocklistMiddleware } from '../_shared/ipBlocklist.ts'
import { getLLMRouter } from '../_shared/llm/router.ts'
import type { ChatMessage, LLMConfig, ModelQualityMetrics } from '../_shared/llm/types.ts'
import { checkRateLimit, createRateLimitResponse, getRateLimitIdentifier, RateLimitPresets } from '../_shared/rateLimit.ts'
import { logUsage } from '../_shared/usageLog.ts'
import { AnalyzeMealMultiRequestSchema, createValidationErrorResponse, validateRequest } from '../_shared/validation.ts'

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

const MEAL_ANALYSIS_JSON_SCHEMA = {
  name: 'meal_analysis',
  strict: true,
  schema: {
    type: 'object',
    required: ['meal', 'items'],
    additionalProperties: false,
    properties: {
      meal: {
        type: 'object',
        required: ['name', 'description', 'serving_size', 'health_score', 'feedback', 'recommendations'],
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          serving_size: { type: 'string' },
          health_score: { type: 'number' },
          feedback: { type: 'string' },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'content', 'priority'],
              additionalProperties: false,
              properties: {
                type: { type: 'string' },
                content: { type: 'string' },
                priority: { type: 'number' },
              },
            },
          },
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['index', 'name', 'visual_analysis', 'estimated_weight_g', 'nutrition_per_unit', 'confidence', 'needs_review'],
          additionalProperties: false,
          properties: {
            index: { type: 'number' },
            name: { type: 'string' },
            visual_analysis: { type: 'string' },
            estimated_weight_g: { type: 'number' },
            nutrition_per_unit: {
              type: 'object',
              required: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol'],
              additionalProperties: false,
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
                fiber: { type: 'number' },
                sugar: { type: 'number' },
                sodium: { type: 'number' },
                cholesterol: { type: 'number' },
              },
            },
            ingredients: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
            needs_review: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const

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

const MAX_MEAL_NAME_CHARS = 60
const MAX_MEAL_NAME_WORDS = 8

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const truncated = text.slice(0, maxChars)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > Math.floor(maxChars * 0.6)) {
    return truncated.slice(0, lastSpace).trim()
  }
  return truncated.trim()
}

function shortenToWordCount(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean)
  return words.slice(0, maxWords).join(' ')
}

const GENERIC_MEAL_NAMES = new Set([
  'meal',
  'analyzed meal',
  'analyzed snack',
  'food',
  'food item',
  'snack',
  'my meal',
  'untitled meal',
])

function isGenericMealName(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (GENERIC_MEAL_NAMES.has(lower)) return true
  if (/^meal\s*\(\d+\s*items?\)$/i.test(lower)) return true
  if (lower.includes('<generate')) return true
  return false
}

function buildItemNameSummary(names: string[]): string {
  const cleanNames = names.map(normalizeWhitespace).filter(Boolean)
  if (cleanNames.length === 0) return ''
  const first = cleanNames[0]!
  if (cleanNames.length === 1) return first
  const second = cleanNames[1]!
  const withSecond = `${first} with ${second}`
  return withSecond.length <= MAX_MEAL_NAME_CHARS ? withSecond : first
}

function buildConciseMealName(params: {
  candidate?: string | null
  normalizedItems: AnalyzeMealMultiLLMResponse['items']
  textItems: MealMultiItemInput[]
  existingMealDescription?: string | null
}): string {
  const { candidate, normalizedItems, textItems, existingMealDescription } = params
  const cleanedCandidate = normalizeWhitespace(candidate ?? '')
  const textItemRaw = textItems.find((item) => typeof item.text === 'string' && item.text.trim().length > 0)?.text ?? ''
  const textItemClean = normalizeWhitespace(textItemRaw)
  const textItemWordCount = textItemClean.split(/\s+/).filter(Boolean).length
  const isVerbatimText = textItemClean.length > 0 && cleanedCandidate.toLowerCase() === textItemClean.toLowerCase()

  let chosen = cleanedCandidate
  if (!chosen) {
    chosen = ''
  }

  if (isVerbatimText && textItemWordCount > 10) {
    chosen = shortenToWordCount(textItemClean, MAX_MEAL_NAME_WORDS)
  }

  if (chosen.length > MAX_MEAL_NAME_CHARS) {
    const firstClause = normalizeWhitespace(chosen.split(/[.!?;]/)[0] ?? '')
    if (firstClause.length >= 3 && firstClause.length < chosen.length) {
      chosen = firstClause
    }
  }

  if (chosen.length > MAX_MEAL_NAME_CHARS) {
    chosen = truncateAtWordBoundary(chosen, MAX_MEAL_NAME_CHARS)
  }

  if (chosen.length >= 3 && !isGenericMealName(chosen)) return chosen

  const itemNames = normalizedItems
    .map((item) => normalizeWhitespace(item.name))
    .filter((name) => name.length > 0 && !isGenericMealName(name) && !name.toLowerCase().includes('item'))
  const summary = buildItemNameSummary(itemNames)
  if (summary) return summary

  const fallback = normalizeWhitespace(existingMealDescription ?? '')
  if (fallback.length > 0 && !isGenericMealName(fallback)) {
    return truncateAtWordBoundary(fallback, MAX_MEAL_NAME_CHARS)
  }

  return 'Meal'
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

interface NutritionClaim {
  nutrient: string
  value: number
  unit: string
  source: string
}

interface PortionClaim {
  amount: number
  unit: string
  ingredient: string
  source: string
}

function parseAmountToken(raw: string): number | null {
  const normalized = raw.trim().toLowerCase()
  if (!normalized) return null

  const wordMap: Record<string, number> = {
    half: 0.5,
    quarter: 0.25,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  }

  if (wordMap[normalized] !== undefined) return wordMap[normalized]

  const fractionMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1] ?? '', 10)
    const denominator = parseInt(fractionMatch[2] ?? '', 10)
    if (denominator > 0) {
      const result = numerator / denominator
      return Number.isFinite(result) ? result : null
    }
    return null
  }

  const parsed = Number.parseFloat(normalized)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return null
}

function normalizePortionUnit(unit: string | undefined): string {
  const raw = (unit ?? '').trim().toLowerCase()
  if (!raw) return 'item'
  const singularMap: Record<string, string> = {
    cups: 'cup',
    tablespoons: 'tbsp',
    tablespoon: 'tbsp',
    teaspoons: 'tsp',
    teaspoon: 'tsp',
    grams: 'g',
    gram: 'g',
    ounces: 'oz',
    ounce: 'oz',
    lbs: 'lb',
    slices: 'slice',
    pieces: 'piece',
    servings: 'serving',
    bananas: 'banana',
    strawberries: 'strawberry',
    eggs: 'egg',
    apples: 'apple',
    oranges: 'orange',
    dates: 'date',
  }
  return singularMap[raw] ?? raw
}

function normalizeIngredient(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^of\s+/i, '')
    .replace(/^[,.;:\-]+/, '')
    .replace(/[,.;:]+$/, '')
    .trim()
}

function shouldSkipPortionIngredient(ingredient: string): boolean {
  const lowered = ingredient.toLowerCase()
  return /^(cal|cals|calorie|calories|kcal|protein|carb|carbs|carbohydrate|carbohydrates|fat|fiber|sugar|sodium|cholesterol)\b/.test(lowered)
}

function extractPortionClaims(contextText?: string, textItems?: string[]): PortionClaim[] {
  const claims: PortionClaim[] = []
  const sources = [
    ...(contextText ? [contextText] : []),
    ...(textItems ?? []),
  ]

  const amountToken = '(?:\\d+(?:\\.\\d+)?|\\d+\\s*\\/\\s*\\d+|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten)'
  const measuredUnits = '(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|g|gram|grams|kg|oz|ounce|ounces|ml|l|lb|lbs)'
  const measuredPattern = new RegExp(`^(${amountToken})\\s*(${measuredUnits})\\s+(.{2,80})$`, 'i')
  const countPattern = new RegExp(`^(${amountToken})\\s+(.{2,80})$`, 'i')

  for (const source of sources) {
    const segments = source
      .split(/\n|,|;|\band\b/gi)
      .map((segment) => segment.replace(/^[\s\-*•]+/, '').trim())
      .filter((segment) => segment.length > 0)

    for (const segment of segments) {
      const measuredMatch = measuredPattern.exec(segment)
      if (measuredMatch) {
        const amount = parseAmountToken(measuredMatch[1] ?? '')
        const unit = normalizePortionUnit(measuredMatch[2])
        const ingredient = normalizeIngredient(measuredMatch[3] ?? '')
        if (!amount || amount <= 0 || amount > 1000) continue
        if (!ingredient || shouldSkipPortionIngredient(ingredient)) continue

        const dedupeKey = `${amount}|${unit}|${ingredient.toLowerCase()}`
        const exists = claims.some((claim) =>
          `${claim.amount}|${claim.unit}|${claim.ingredient.toLowerCase()}` === dedupeKey)
        if (!exists) {
          claims.push({
            amount,
            unit,
            ingredient,
            source: measuredMatch[0]!.trim(),
          })
        }
        continue
      }

      const countMatch = countPattern.exec(segment)
      if (!countMatch) continue
      const amount = parseAmountToken(countMatch[1] ?? '')
      const rawIngredient = normalizeIngredient(countMatch[2] ?? '')
      if (!amount || amount <= 0 || amount > 1000) continue
      if (!rawIngredient || shouldSkipPortionIngredient(rawIngredient)) continue

      // If this segment starts with an explicit measured unit, measuredPattern should own it.
      if (/^(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|g|gram|grams|kg|oz|ounce|ounces|ml|l|lb|lbs)\b/i.test(rawIngredient)) {
        continue
      }

      const dedupeKey = `${amount}|item|${rawIngredient.toLowerCase()}`
      const exists = claims.some((claim) =>
        `${claim.amount}|${claim.unit}|${claim.ingredient.toLowerCase()}` === dedupeKey)
      if (!exists) {
        claims.push({
          amount,
          unit: 'item',
          ingredient: rawIngredient,
          source: countMatch[0]!.trim(),
        })
      }
    }
  }

  return claims
}

function extractNutritionClaims(contextText?: string, textItems?: string[]): NutritionClaim[] {
  const claims: NutritionClaim[] = []
  const sources = [
    ...(contextText ? [contextText] : []),
    ...(textItems ?? []),
  ]

  const patterns: Array<{ regex: RegExp; nutrient: string; unit: string }> = [
    // Protein: "24g protein", "24 grams of protein", "protein: 24g", "~24g protein", "about 30g protein"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:g|gram|grams)\s+(?:of\s+)?protein/gi, nutrient: 'protein', unit: 'g' },
    { regex: /(\d+)\s*(?:g|gram|grams)\s+(?:scoop|serving)\s+(?:of\s+)?protein/gi, nutrient: 'protein', unit: 'g' },
    { regex: /protein[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*g/gi, nutrient: 'protein', unit: 'g' },
    { regex: /(?:has|contains|with)\s+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:g|gram|grams)\s+(?:of\s+)?protein/gi, nutrient: 'protein', unit: 'g' },
    // Calories: "300 calories", "~500 kcal", "has about 400 calories", "calories: 600"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:cal|cals|calories|kcal)/gi, nutrient: 'calories', unit: 'kcal' },
    { regex: /(?:has|contains|is)\s+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:cal|cals|calories|kcal)/gi, nutrient: 'calories', unit: 'kcal' },
    { regex: /calories?[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)/gi, nutrient: 'calories', unit: 'kcal' },
    // Carbs: "45g carbs", "carbs: 30g", "about 50g carbohydrates"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:g|gram|grams)\s+(?:of\s+)?(?:carb|carbs|carbohydrates)/gi, nutrient: 'carbs', unit: 'g' },
    { regex: /(?:carb|carbs|carbohydrates)[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*g/gi, nutrient: 'carbs', unit: 'g' },
    // Fat: "15g fat", "fat: 20g", "about 10g of fat"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:g|gram|grams)\s+(?:of\s+)?fat/gi, nutrient: 'fat', unit: 'g' },
    { regex: /fat[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*g/gi, nutrient: 'fat', unit: 'g' },
    // Fiber: "8g fiber", "fiber: 5g"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:g|gram|grams)\s+(?:of\s+)?fiber/gi, nutrient: 'fiber', unit: 'g' },
    { regex: /fiber[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*g/gi, nutrient: 'fiber', unit: 'g' },
    // Sugar: "12g sugar", "sugar: 15g"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:g|gram|grams)\s+(?:of\s+)?sugar/gi, nutrient: 'sugar', unit: 'g' },
    { regex: /sugar[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*g/gi, nutrient: 'sugar', unit: 'g' },
    // Sodium: "500mg sodium", "sodium: 300mg"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:mg)\s+(?:of\s+)?sodium/gi, nutrient: 'sodium', unit: 'mg' },
    { regex: /sodium[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*mg/gi, nutrient: 'sodium', unit: 'mg' },
    // Cholesterol: "200mg cholesterol", "cholesterol: 150mg"
    { regex: /(?:~|about|around|roughly|approximately)?\s*(\d+)\s*(?:mg)\s+(?:of\s+)?cholesterol/gi, nutrient: 'cholesterol', unit: 'mg' },
    { regex: /cholesterol[:\s]+(?:~|about|around|roughly|approximately)?\s*(\d+)\s*mg/gi, nutrient: 'cholesterol', unit: 'mg' },
  ]

  for (const source of sources) {
    for (const { regex, nutrient, unit } of patterns) {
      regex.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = regex.exec(source)) !== null) {
        const value = parseInt(match[1]!, 10)
        if (value > 0 && value < 10000) {
          const isDuplicate = claims.some((c) => c.nutrient === nutrient && c.value === value)
          if (!isDuplicate) {
            claims.push({ nutrient, value, unit, source: match[0]! })
          }
        }
      }
    }
  }

  return claims
}

function buildLockedValuesBlock(claims: NutritionClaim[]): string {
  if (claims.length === 0) return ''
  const lines = claims.map((c) => `- ${c.nutrient}: ${c.value}${c.unit} (from user input: "${c.source}")`)
  return `
USER-STATED NUTRITION VALUES (treat as exact, do NOT adjust):
${lines.join('\n')}
`
}

function buildLockedPortionsBlock(claims: PortionClaim[]): string {
  if (claims.length === 0) return ''
  const lines = claims.map((c) => `- ${c.amount} ${c.unit} ${c.ingredient} (from user input: "${c.source}")`)
  return `
USER-STATED PORTIONS (treat as exact, do NOT inflate or re-estimate):
${lines.join('\n')}
`
}

function toSingularWord(word: string): string {
  const lower = word.toLowerCase()
  if (lower.endsWith('ies') && lower.length > 3) return `${lower.slice(0, -3)}y`
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) return lower.slice(0, -1)
  return lower
}

function ingredientMatches(ingredient: string, ...candidates: string[]): boolean {
  const words = ingredient
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => toSingularWord(w))
    .filter(Boolean)
  return candidates.some((candidate) => words.includes(toSingularWord(candidate)))
}

function estimateClaimWeightGrams(claim: PortionClaim): number | null {
  const { amount, ingredient } = claim
  const unit = normalizePortionUnit(claim.unit)
  if (!Number.isFinite(amount) || amount <= 0) return null

  if (unit === 'g') return amount
  if (unit === 'kg') return amount * 1000
  if (unit === 'oz') return amount * 28.35
  if (unit === 'lb') return amount * 453.6
  if (unit === 'ml') return amount
  if (unit === 'l') return amount * 1000

  const ingredientIsPeanutButter = ingredientMatches(ingredient, 'peanut', 'butter')
  const ingredientIsHemp = ingredientMatches(ingredient, 'hemp', 'seed')
  const ingredientIsYogurt = ingredientMatches(ingredient, 'yogurt', 'yoghurt')

  if (unit === 'tbsp') {
    if (ingredientIsPeanutButter) return amount * 16
    if (ingredientIsHemp) return amount * 10
    if (ingredientIsYogurt) return amount * 15
    return amount * 15
  }

  if (unit === 'tsp') {
    if (ingredientIsPeanutButter) return amount * 5.3
    if (ingredientIsHemp) return amount * 3.3
    if (ingredientIsYogurt) return amount * 5
    return amount * 5
  }

  if (unit === 'cup') {
    if (ingredientIsYogurt) return amount * 227
    if (ingredientIsHemp) return amount * 160
    return amount * 240
  }

  if (unit === 'item') {
    if (ingredientMatches(ingredient, 'banana')) return amount * 118
    if (ingredientMatches(ingredient, 'strawberry')) return amount * 12
    if (ingredientMatches(ingredient, 'egg')) return amount * 50
    if (ingredientMatches(ingredient, 'apple')) return amount * 182
    if (ingredientMatches(ingredient, 'orange')) return amount * 131
    if (ingredientMatches(ingredient, 'date')) return amount * 7
  }

  return null
}

function enforcePortionClaims(
  normalized: AnalyzeMealMultiLLMResponse,
  sourceItems: MealMultiItemInput[],
): void {
  if (normalized.items.length === 0 || sourceItems.length === 0) return

  sourceItems.forEach((sourceItem, sourceIndex) => {
    if (sourceItem.itemType !== 'text') return
    const text = sourceItem.text?.trim()
    if (!text) return

    const claims = extractPortionClaims(undefined, [text])
    if (claims.length === 0) return

    const estimatedClaimWeights = claims
      .map((claim) => estimateClaimWeightGrams(claim))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)

    const parsedCoverage = estimatedClaimWeights.length / claims.length
    if (estimatedClaimWeights.length === 0 || parsedCoverage < 0.6) {
      console.log(`⚠️ Skipping portion enforcement for text item ${sourceIndex}: low confidence (${estimatedClaimWeights.length}/${claims.length} claims converted to grams).`)
      return
    }

    const expectedWeightG = estimatedClaimWeights.reduce((sum, w) => sum + w, 0)
    if (!Number.isFinite(expectedWeightG) || expectedWeightG < 5 || expectedWeightG > 2500) {
      console.log(`⚠️ Skipping portion enforcement for text item ${sourceIndex}: expected weight ${expectedWeightG}g out of range.`)
      return
    }

    const normalizedItem = normalized.items.find((item) => Number(item.index) === sourceIndex)
    if (!normalizedItem) return

    const currentWeight = normalizedItem.estimated_weight_g
    const safeCurrentWeight = Number.isFinite(currentWeight) && currentWeight > 0 ? currentWeight : expectedWeightG
    const scale = expectedWeightG / safeCurrentWeight

    normalizedItem.estimated_weight_g = Math.round(expectedWeightG)
    normalizedItem.nutrition_per_unit.calories = clampNumber(Math.round(normalizedItem.nutrition_per_unit.calories * scale), 0, 10000)
    normalizedItem.nutrition_per_unit.protein = clampNumber(Number((normalizedItem.nutrition_per_unit.protein * scale).toFixed(1)), 0, 1000)
    normalizedItem.nutrition_per_unit.carbs = clampNumber(Number((normalizedItem.nutrition_per_unit.carbs * scale).toFixed(1)), 0, 2000)
    normalizedItem.nutrition_per_unit.fat = clampNumber(Number((normalizedItem.nutrition_per_unit.fat * scale).toFixed(1)), 0, 1000)
    normalizedItem.nutrition_per_unit.fiber = clampNumber(Number((normalizedItem.nutrition_per_unit.fiber * scale).toFixed(1)), 0, 500)

    if (typeof normalizedItem.nutrition_per_unit.sugar === 'number') {
      normalizedItem.nutrition_per_unit.sugar = clampNumber(Number((normalizedItem.nutrition_per_unit.sugar * scale).toFixed(1)), 0, 1000)
    }
    if (typeof normalizedItem.nutrition_per_unit.sodium === 'number') {
      normalizedItem.nutrition_per_unit.sodium = clampNumber(Math.round(normalizedItem.nutrition_per_unit.sodium * scale), 0, 20000)
    }
    if (typeof normalizedItem.nutrition_per_unit.cholesterol === 'number') {
      normalizedItem.nutrition_per_unit.cholesterol = clampNumber(Math.round(normalizedItem.nutrition_per_unit.cholesterol * scale), 0, 5000)
    }

    console.log(
      `🔒 Enforced portion-derived weight for text item ${sourceIndex}: ` +
      `${Math.round(safeCurrentWeight)}g -> ${Math.round(expectedWeightG)}g (scale ${scale.toFixed(2)}).`,
    )
  })
}

function applyPostLLMSanityChecks(
  normalized: AnalyzeMealMultiLLMResponse,
  sourceItems: MealMultiItemInput[],
  lockedClaims: NutritionClaim[],
): void {
  if (!Array.isArray(normalized.items) || normalized.items.length === 0) return
  const hasLockedCalories = lockedClaims.some((claim) => claim.nutrient === 'calories')

  normalized.items.forEach((item) => {
    const nutrition = item.nutrition_per_unit
    const calories = Number(nutrition.calories ?? 0)
    const protein = Number(nutrition.protein ?? 0)
    const carbs = Number(nutrition.carbs ?? 0)
    const fat = Number(nutrition.fat ?? 0)
    const weightG = Number(item.estimated_weight_g ?? 0)

    const macroCalories = protein * 4 + carbs * 4 + fat * 9
    const maxRef = Math.max(calories, macroCalories, 1)
    const macroDeltaRatio = Math.abs(calories - macroCalories) / maxRef
    const severeMacroMismatch = calories > 0 && macroCalories > 0 && macroDeltaRatio > 0.4
    const moderateMacroMismatch = calories > 0 && macroCalories > 0 && macroDeltaRatio > 0.2

    if (severeMacroMismatch && !hasLockedCalories) {
      // Soft reconcile calories toward macro-implied energy while preserving user hard-lock behavior
      // (explicit nutrition claims are enforced in a separate dedicated step).
      const reconciledCalories = Math.round((calories + macroCalories) / 2)
      nutrition.calories = clampNumber(reconciledCalories, 0, 10000)
      item.needs_review = true
      console.log(
        `⚖️ Reconciled calories for item ${item.index} "${item.name}": ` +
        `${calories} -> ${nutrition.calories} (macro implied ${Math.round(macroCalories)}).`,
      )
    } else if (moderateMacroMismatch || (severeMacroMismatch && hasLockedCalories)) {
      item.needs_review = true
      console.log(
        `⚠️ Macro/calorie mismatch for item ${item.index} "${item.name}": ` +
        `cal=${calories}, macroCal=${Math.round(macroCalories)}.`,
      )
    }

    if (weightG > 0 && calories > 0) {
      const kcalPerGram = calories / weightG
      if (kcalPerGram > 9.5 || (weightG >= 20 && kcalPerGram < 0.2)) {
        item.needs_review = true
        console.log(
          `⚠️ Implausible kcal/g for item ${item.index} "${item.name}": ` +
          `${kcalPerGram.toFixed(2)} kcal/g at ${Math.round(weightG)}g.`,
        )
      }
    }

    const sourceItem = sourceItems[Number(item.index)]
    if (sourceItem?.itemType === 'text' && sourceItem.text?.trim()) {
      const claims = extractPortionClaims(undefined, [sourceItem.text.trim()])
      const baselineWeights = claims
        .map((claim) => estimateClaimWeightGrams(claim))
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
      if (baselineWeights.length > 0 && weightG > 0) {
        const baselineWeight = baselineWeights.reduce((sum, w) => sum + w, 0)
        const ratio = weightG / baselineWeight
        if (ratio > 1.8 || ratio < 0.55) {
          item.needs_review = true
          console.log(
            `⚠️ Portion baseline mismatch for item ${item.index} "${item.name}": ` +
            `${Math.round(weightG)}g vs baseline ${Math.round(baselineWeight)}g.`,
          )
        }
      }
    }
  })
}

function applyQuantityConsistencyChecks(
  normalized: AnalyzeMealMultiLLMResponse,
  sourceItems: MealMultiItemInput[],
): void {
  if (!Array.isArray(normalized.items) || normalized.items.length === 0) return

  normalized.items.forEach((item) => {
    const sourceItem = sourceItems[Number(item.index)]
    if (!sourceItem) return

    const quantity = normalizeQuantity(sourceItem.quantity)
    if (quantity <= 1) return

    const n = item.nutrition_per_unit
    const projectedTotal = {
      calories: Math.round((n.calories ?? 0) * quantity),
      protein: Number(((n.protein ?? 0) * quantity).toFixed(1)),
      carbs: Number(((n.carbs ?? 0) * quantity).toFixed(1)),
      fat: Number(((n.fat ?? 0) * quantity).toFixed(1)),
    }

    // Guardrail only: if text already repeats the same count signal, there is a risk the model
    // may have already baked quantity into per-unit estimates. We flag review, but never block.
    if (sourceItem.itemType === 'text' && sourceItem.text?.trim()) {
      const text = sourceItem.text.toLowerCase()
      const quantityRegex = new RegExp(`\\b(?:x\\s*)?${quantity}\\b|\\b${quantity}\\s*x\\b`, 'i')
      if (quantityRegex.test(text)) {
        item.needs_review = true
        console.log(
          `⚠️ Quantity double-count risk on item ${item.index} "${item.name}": ` +
          `payload quantity=${quantity}, text="${sourceItem.text}".`,
        )
      }
    }

    console.log(
      `📦 Quantity check item ${item.index} "${item.name}": quantity=${quantity}, ` +
      `projectedTotals=${JSON.stringify(projectedTotal)}.`,
    )
  })
}

/**
 * Hard-override LLM output with user-stated nutrition values.
 * Distributes total claims proportionally across items based on calorie share,
 * or evenly if all items have 0 calories.
 */
function enforceNutritionClaims(
  normalized: AnalyzeMealMultiLLMResponse,
  claims: NutritionClaim[],
): void {
  if (claims.length === 0 || normalized.items.length === 0) return

  const nutrientToField: Record<string, keyof NutritionPerUnit> = {
    calories: 'calories',
    protein: 'protein',
    carbs: 'carbs',
    fat: 'fat',
    fiber: 'fiber',
    sugar: 'sugar',
    sodium: 'sodium',
    cholesterol: 'cholesterol',
  }

  for (const claim of claims) {
    const field = nutrientToField[claim.nutrient]
    if (!field) continue

    const items = normalized.items
    const totalFromLLM = items.reduce((sum, it) => sum + (it.nutrition_per_unit[field] ?? 0), 0)

    if (items.length === 1) {
      items[0]!.nutrition_per_unit[field] = claim.value
      console.log(`🔒 Enforced ${field}=${claim.value} on single item "${items[0]!.name}"`)
      continue
    }

    // Distribute proportionally by the LLM's own calorie share (best proxy for item size)
    const calShares = items.map((it) => it.nutrition_per_unit.calories || 0)
    const totalCals = calShares.reduce((a, b) => a + b, 0)

    if (totalCals > 0 && field !== 'calories') {
      let distributed = 0
      items.forEach((it, idx) => {
        const share = calShares[idx]! / totalCals
        const portion = idx === items.length - 1
          ? claim.value - distributed
          : Math.round(share * claim.value * 10) / 10
        it.nutrition_per_unit[field] = portion
        distributed += portion
      })
    } else {
      // Even split fallback
      const portion = Math.round((claim.value / items.length) * 10) / 10
      items.forEach((it, idx) => {
        it.nutrition_per_unit[field] = idx === items.length - 1
          ? claim.value - portion * (items.length - 1)
          : portion
      })
    }

    console.log(`🔒 Enforced ${field}=${claim.value} (distributed across ${items.length} items, LLM had ${totalFromLLM})`)
  }
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

  const textItemTexts = items
    .filter((item) => item.itemType === 'text' && item.text?.trim())
    .map((item) => item.text!.trim())

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

  const nutritionClaims = extractNutritionClaims(contextText, textItemTexts)
  const portionClaims = extractPortionClaims(contextText, textItemTexts)
  const lockedValuesBlock = buildLockedValuesBlock(nutritionClaims)
  const lockedPortionsBlock = buildLockedPortionsBlock(portionClaims)

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
Analyze a meal that is composed of multiple items (photos, text, or verified items).

Important rules:
- INDEXING: Use the provided "Photo item X" or "Text item X" index for each item. 
- MULTIPLE ITEMS IN ONE PHOTO: If a single photo contains multiple distinct food components (e.g., a plate with chicken, rice, and broccoli), you should list them as separate objects in the "items" array, but ALL of them must use the SAME "index" provided for that photo.
- For 'verified' items, use them ONLY for context; do NOT include them in your "items" array response.
- SOURCE PRIORITY (highest -> lowest): 1) Verified nutrition data, 2) User-stated portions/quantities, 3) Visual estimation from photos.
- If user text and photo evidence conflict, trust the user-stated quantity/portion and only use vision for details the user did not specify.
- USER CONTEXT AUTHORITY: The "Overall meal context" and text item descriptions are provided directly by the user. If the user states specific quantities, portions, or nutritional values (e.g. "24g protein", "2 tablespoons of olive oil", "300 calories"), treat those as EXACT ground-truth values. Do NOT adjust or second-guess them based on visual estimation.
- SUPPLEMENT CONVENTION: When a user says "X gram scoop of protein powder" or "X gram protein", interpret X as the protein CONTENT (grams of protein), not the powder weight. This matches how supplements are labeled (e.g. "24g scoop" = 24g of protein).
- PHOTO ITEMS — follow this Chain of Thought (Volume First) process:
  1. IDENTIFY: Precisely identify the food item.
  2. SPATIAL REFERENCE: Compare the item's size to reference objects in the photo (e.g., standard 10-inch plate, fork, glass, or the user's hand).
  3. VOLUME: Estimate the physical volume (e.g., "roughly 1.5 cups" or "200ml").
  4. WEIGHT: Estimate the physical weight in grams based on density.
  5. CALCULATE: Only after estimating weight, calculate the nutrition values.
- TEXT ITEMS — the user has already described the food. Use their stated quantities and portions as exact values. Only estimate nutrition for details the user did NOT specify. Do NOT re-estimate portions the user already provided.
${tierRules}
- Quantity is an integer multiplier for the entire item.
- IMPORTANT: "nutrition_per_unit" MUST always represent ONE unit only. Do NOT multiply "nutrition_per_unit" by quantity.
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
${lockedValuesBlock}
${lockedPortionsBlock}
Return JSON with this schema:
{
  "meal": {
    "name": "<short, descriptive title (max 50 chars). Must describe the actual food, e.g. 'Berry Protein Smoothie' or 'Grilled Chicken Salad'. NEVER use generic names like 'Analyzed meal', 'Meal', 'Food', or 'Snack'. Do NOT repeat the user's full text verbatim.>",
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

    // 2. Daily usage limit — applies to ALL users (free: 3/day, Pro: 100/day)
    const hasAIItems = rawItems.some((item: any) => item.itemType === 'photo' || item.itemType === 'text');
    if (hasAIItems) {
      const dailyLimitResult = await checkDailyUserLimit(supabase as any, userId, isPro);
      if (!dailyLimitResult.allowed) {
        console.warn(`🚫 Daily limit reached for user ${userId} (${dailyLimitResult.count}/${dailyLimitResult.limit}, isPro=${isPro})`);
        return createDailyLimitResponse(dailyLimitResult, corsHeaders);
      }
    }

    // Normalize and validate items
    const items: MealMultiItemInput[] = rawItems
      .map((item): MealMultiItemInput => ({
        itemType: item.itemType,
        imageUrl: item.imageUrl,
        text: item.text,
        verifiedNutrition: item.verifiedNutrition,
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
          max_tokens: 3500,
          temperature: 0.3,
          response_format: { type: 'json_schema', json_schema: MEAL_ANALYSIS_JSON_SCHEMA },
        },
        llm
      )
    } catch (llmError) {
      console.error('❌ LLM Router Error:', llmError)
      throw new Error(`AI Analysis failed: ${llmError instanceof Error ? llmError.message : 'Unknown AI error'}`)
    }
    console.log('✅ LLM response received.')

    // Extract canary routing metadata (present when using the updated router)
    const routing = (chatResponse as any)._routing as {
      model: string;
      isCanary: boolean;
      usedFallback: boolean;
      fallbackReason?: string;
      latencyMs: number;
    } | undefined

    if (routing) {
      console.log(`🎯 Routing info: model=${routing.model}, isCanary=${routing.isCanary}, usedFallback=${routing.usedFallback}, latency=${routing.latencyMs}ms`)
    }

    logUsage({
      userId,
      mealId: finalMealId,
      functionName: 'analyze-meal-multi',
      action: mealId ? 'reanalyze' : 'initial_scan',
      model: routing?.model ?? chatResponse.model,
      promptTokens: chatResponse.usage?.prompt_tokens,
      completionTokens: chatResponse.usage?.completion_tokens,
      totalTokens: chatResponse.usage?.total_tokens,
      isPro,
    });

    const analysisTextRaw = chatResponse.content
    const analysisText = stripMarkdown(analysisTextRaw)
    const openaiData = {
      model: chatResponse.model,
      choices: [{ message: { content: analysisTextRaw } }],
      usage: chatResponse.usage,
    }

    let analysis: AnalyzeMealMultiLLMResponse
    let jsonParseSuccess = true
    try {
      analysis = JSON.parse(analysisText) as AnalyzeMealMultiLLMResponse
    } catch (err) {
      jsonParseSuccess = false
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

    // Deterministically anchor text-item nutrition to user-stated portions (high-confidence cases only).
    // This runs before explicit nutrition claim enforcement so hard nutrition locks still win.
    enforcePortionClaims(normalized, normalizedItemsWithHero)

    // Hard-override LLM values with any user-stated nutrition claims
    const textItemTextsForEnforcement = normalizedItemsWithHero
      .filter((item) => item.itemType === 'text' && item.text?.trim())
      .map((item) => item.text!.trim())
    const claimsToEnforce = extractNutritionClaims(contextText, textItemTextsForEnforcement)
    if (claimsToEnforce.length > 0) {
      console.log(`🔒 Enforcing ${claimsToEnforce.length} user-stated nutrition claim(s):`, claimsToEnforce.map(c => `${c.nutrient}=${c.value}${c.unit}`))
      enforceNutritionClaims(normalized, claimsToEnforce)
    }

    // Sanity/reconciliation pass to catch implausible outputs before persistence.
    applyPostLLMSanityChecks(normalized, normalizedItemsWithHero, claimsToEnforce)
    applyQuantityConsistencyChecks(normalized, normalizedItemsWithHero)

    // Log model quality metrics for canary comparison
    const needsReviewCount = normalized.items.filter((it) => it.needs_review).length
    const qualityMetrics: ModelQualityMetrics = {
      model: routing?.model ?? chatResponse.model,
      jsonParseSuccess,
      usedFallback: routing?.usedFallback ?? false,
      latencyMs: routing?.latencyMs ?? (Date.now() - startTime),
      usage: chatResponse.usage,
      needsReviewCount,
      totalItemCount: normalized.items.length,
      fallbackReason: routing?.fallbackReason,
    }
    llmRouter.logQualityMetrics(qualityMetrics)

    // Clean up generic names/placeholders
    if (isGenericMealName(normalized.meal.name)) {
      const firstValidItem = normalized.items.find(
        (it) => it.name && !isGenericMealName(it.name) && !it.name.toLowerCase().includes('item')
      );
      if (firstValidItem) {
        normalized.meal.name = firstValidItem.name;
      }
      // If no valid item found, leave as-is — buildConciseMealName will try item names next
    }

    // Save analysis_results record (includes model quality metrics for canary comparison)
    const processingTime = Date.now() - startTime
    const { data: analysisRecord } = await supabase
      .from('analysis_results')
      .insert({
        meal_id: finalMealId,
        analysis_type: 'combined',
        raw_response: {
          ...openaiData,
          _quality_metrics: qualityMetrics,
        },
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
    const finalName = buildConciseMealName({
      candidate: normalized.meal.name,
      normalizedItems: normalized.items,
      textItems: normalizedItemsWithHero.filter((item) => item.itemType === 'text'),
      existingMealDescription,
    })
    normalized.meal.name = finalName

    console.log(`⏳ Finalizing meal record: ${finalMealId}...`)
    
    // Compute health category string for storage
    const healthCategory = toMealHealthCategory(normalized.meal.health_score)

    // Compute new descriptive nutrition tag from quantity-adjusted totals.
    const totalMacros = normalized.items.reduce((acc, it) => {
      const sourceItem = normalizedItemsWithHero[Number(it.index)]
      const quantity = sourceItem ? normalizeQuantity(sourceItem.quantity) : 1
      acc.calories += (it.nutrition_per_unit.calories * quantity);
      acc.protein += (it.nutrition_per_unit.protein * quantity);
      acc.carbs += (it.nutrition_per_unit.carbs * quantity);
      acc.fat += (it.nutrition_per_unit.fat * quantity);
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
        analysis_version: 'multi-1.3',
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
        _model: qualityMetrics.model,
        _used_fallback: qualityMetrics.usedFallback,
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






