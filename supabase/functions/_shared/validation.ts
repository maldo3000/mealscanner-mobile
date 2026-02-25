/**
 * Shared input validation utilities using Zod
 * Provides comprehensive validation schemas for all Edge Function endpoints
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// ==========================================
// Common Schemas
// ==========================================

export const UUIDSchema = z.string().uuid('Invalid UUID format')

export const URLSchema = z.string().url('Invalid URL format')

export const PositiveIntSchema = z.number().int().positive()

export const NonNegativeIntSchema = z.number().int().min(0)

// ==========================================
// Meal Analysis Schemas
// ==========================================

export const MealItemSchema = z.object({
  itemType: z.enum(['photo', 'text', 'verified'], {
    errorMap: () => ({ message: 'itemType must be "photo", "text", or "verified"' })
  }),
  imageUrl: z.string().url('Invalid image URL').optional(),
  text: z.string().min(2, 'Text must be at least 2 characters').max(1000, 'Text must be under 1000 characters').optional(),
  verifiedNutrition: z.object({
    name: z.string().min(1).max(200),
    calories: z.number().min(0).max(10000),
    protein: z.number().min(0).max(1000),
    carbs: z.number().min(0).max(2000),
    fat: z.number().min(0).max(1000),
    fiber: z.number().min(0).max(500).optional(),
    sodium: z.number().min(0).max(50000).optional(),
    ingredients: z.string().max(5000).optional(),
  }).optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
  orderIndex: z.number().int().min(0, 'Order index cannot be negative'),
  isHero: z.boolean(),
}).refine(
  (data) => {
    // Photo items must have imageUrl
    if (data.itemType === 'photo' && !data.imageUrl) return false
    // Text items must have text
    if (data.itemType === 'text' && (!data.text || data.text.trim().length < 2)) return false
    // Verified items must have verifiedNutrition
    if (data.itemType === 'verified' && !data.verifiedNutrition) return false
    return true
  },
  { message: 'Item data does not match itemType requirements' }
)

export const AnalyzeMealMultiRequestSchema = z.object({
  userId: z.string().uuid().optional(), // Optional since we use authenticated user
  mealId: z.string().uuid().optional(),
  contextText: z.string().max(500, 'Context text must be under 500 characters').optional(),
  items: z.array(MealItemSchema).min(1, 'At least one item is required').max(10, 'Maximum 10 items allowed'),
  isPro: z.boolean().optional(),
  llm: z.object({
    provider: z.enum(['openai', 'openrouter']).optional(),
    model: z.string().optional(),
  }).optional(),
})

// ==========================================
// Recipe Analysis Schemas
// ==========================================

export const RecipeImageAnalysisRequestSchema = z.object({
  image_url: z.string().url('Invalid image URL'),
  user_id: z.string().uuid().optional(), // Optional since we use authenticated user
  is_pro: z.boolean().optional(),
  description: z.string().max(1000).optional(),
  source_meal_id: z.string().uuid().optional(),
})

export const RecipeTextAnalysisRequestSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters').max(5000, 'Description must be under 5000 characters'),
  user_id: z.string().uuid().optional(),
  is_pro: z.boolean().optional(),
  source_meal_id: z.string().uuid().optional(),
})

export const RecipeSuggestionRequestSchema = z.object({
  user_input: z.string().min(2, 'Input must be at least 2 characters').max(1000, 'Input must be under 1000 characters'),
  user_id: z.string().uuid().optional(),
  is_pro: z.boolean().optional(),
  nutrition_goals: z.object({
    dailyTargets: z.object({
      calories: z.number().min(500).max(10000),
      proteinGrams: z.number().min(0).max(500),
      carbGrams: z.number().min(0).max(1000),
      fatGrams: z.number().min(0).max(500),
      fibreGrams: z.number().min(0).max(200),
    }),
    focusAreas: z.array(z.string()).optional(),
    goalType: z.string().optional(),
  }).optional(),
})

export const RecipeSuggestionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  estimated_calories: z.number().min(0).max(10000).optional(),
  estimated_protein: z.number().min(0).max(1000).optional(),
  tags: z.array(z.string()).optional(),
  cuisine_type: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
})

export const GenerateRecipeFromSuggestionRequestSchema = z.object({
  suggestion: RecipeSuggestionSchema,
  user_id: z.string().uuid().optional(),
  is_pro: z.boolean().optional(),
  nutrition_goals: z.object({
    dailyTargets: z.object({
      calories: z.number().min(500).max(10000),
      proteinGrams: z.number().min(0).max(500),
      carbGrams: z.number().min(0).max(1000),
      fatGrams: z.number().min(0).max(500),
      fibreGrams: z.number().min(0).max(200),
    }),
    focusAreas: z.array(z.string()).optional(),
  }).optional(),
})

// ==========================================
// Speech-to-Text Schemas
// ==========================================

export const SpeechToTextRequestSchema = z.object({
  audio_url: z.string().url('Invalid audio URL'),
  user_id: z.string().uuid().optional(),
  language: z.string().min(2).max(10).default('en'),
})

export const SpeechToTextDirectRequestSchema = z.object({
  audio_data: z.string().min(100, 'Audio data too short - may be empty or corrupted'),
  user_id: z.string().uuid().optional(),
  language: z.string().min(2).max(10).default('en'),
})

export const GenerateWeeklyNutritionReportRequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  timezone: z.string().min(1, 'Timezone is required').max(100).default('UTC'),
  include_summary: z.boolean().optional(),
  window_end_local: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'window_end_local must be YYYY-MM-DD').optional(),
})

// ==========================================
// Validation Helper Functions
// ==========================================

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  issues?: z.ZodIssue[]
}

/**
 * Validates request data against a Zod schema and returns a typed result
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  // Format error message from Zod issues
  const issues = result.error.issues
  const errorMessage = issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')
  
  return {
    success: false,
    error: errorMessage,
    issues: issues,
  }
}

/**
 * Creates a validation error response with proper format
 */
export function createValidationErrorResponse(
  result: ValidationResult<unknown>,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Validation failed',
      details: result.error,
      issues: result.issues?.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// ==========================================
// File Size Validation
// ==========================================

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * Validates base64 data size (approximate, since base64 encoding adds ~33% overhead)
 */
export function validateBase64Size(base64Data: string, maxBytes: number): boolean {
  // Remove data URL prefix if present
  const data = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data
  // Base64 encoding increases size by ~33%, so actual bytes ≈ base64Length * 3/4
  const approximateBytes = (data.length * 3) / 4
  return approximateBytes <= maxBytes
}

/**
 * Validates audio data size and returns error response if too large
 */
export function validateAudioSize(
  audioData: string,
  corsHeaders: Record<string, string>
): Response | null {
  if (!validateBase64Size(audioData, MAX_AUDIO_SIZE)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Audio file exceeds maximum size of ${MAX_AUDIO_SIZE / (1024 * 1024)}MB`,
      }),
      {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
  return null
}
