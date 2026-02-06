/**
 * Frontend validation schemas using Zod
 * Provides comprehensive client-side validation before API calls
 */

import { z } from 'zod'

// ==========================================
// Authentication Schemas
// ==========================================

export const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be under 255 characters')

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be under 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )

export const PasswordSchemaSimple = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchemaSimple,
})

export const SignUpSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ==========================================
// User Profile Schemas
// ==========================================

export const FullNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be under 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')

export const ProfileUpdateSchema = z.object({
  full_name: FullNameSchema.optional(),
  avatar_url: z.string().url('Invalid URL').optional().nullable(),
  nutrition_goal: z.string().max(200).optional().nullable(),
  show_metrics: z.boolean().optional(),
})

// ==========================================
// Nutrition Goals Schemas
// ==========================================

export const NutritionGoalsSchema = z.object({
  goal_type: z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'health'], {
    errorMap: () => ({ message: 'Please select a valid goal type' })
  }),
  target_calories: z.number().min(500, 'Calories must be at least 500').max(10000, 'Calories cannot exceed 10,000').optional(),
  target_protein: z.number().min(0, 'Protein cannot be negative').max(500, 'Protein cannot exceed 500g').optional(),
  target_carbs: z.number().min(0, 'Carbs cannot be negative').max(1000, 'Carbs cannot exceed 1000g').optional(),
  target_fat: z.number().min(0, 'Fat cannot be negative').max(500, 'Fat cannot exceed 500g').optional(),
  target_fiber: z.number().min(0, 'Fiber cannot be negative').max(200, 'Fiber cannot exceed 200g').optional(),
  dietary_restrictions: z.array(z.string()).max(10, 'Maximum 10 dietary restrictions').optional(),
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']).optional(),
})

// ==========================================
// Meal Input Schemas
// ==========================================

export const MealDescriptionSchema = z
  .string()
  .min(2, 'Description must be at least 2 characters')
  .max(1000, 'Description must be under 1000 characters')

export const MealTextInputSchema = z.object({
  description: MealDescriptionSchema,
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']).optional(),
})

export const MealContextSchema = z
  .string()
  .max(500, 'Context must be under 500 characters')
  .optional()

// ==========================================
// Recipe Schemas
// ==========================================

export const RecipeNameSchema = z
  .string()
  .min(2, 'Recipe name must be at least 2 characters')
  .max(200, 'Recipe name must be under 200 characters')

export const RecipeDescriptionSchema = z
  .string()
  .min(10, 'Description must be at least 10 characters')
  .max(5000, 'Description must be under 5000 characters')

export const RecipeSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Search query must be under 200 characters'),
})

// ==========================================
// Validation Helper Functions
// ==========================================

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  errors?: Record<string, string>
}

/**
 * Validates data against a Zod schema and returns a typed result
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  // Format errors into a more usable structure
  const errors: Record<string, string> = {}
  result.error.issues.forEach(issue => {
    const path = issue.path.join('.') || 'general'
    // Only keep the first error for each field
    if (!errors[path]) {
      errors[path] = issue.message
    }
  })
  
  // Get the first error as the main error message
  const firstError = result.error.issues[0]?.message || 'Validation failed'
  
  return {
    success: false,
    error: firstError,
    errors,
  }
}

/**
 * Validates a single field value
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { valid: boolean; error?: string } {
  const result = schema.safeParse(value)
  
  if (result.success) {
    return { valid: true }
  }
  
  return {
    valid: false,
    error: result.error.issues[0]?.message || 'Invalid value',
  }
}

/**
 * Creates a validation hook for forms
 */
export function createFormValidator<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) {
  return {
    validate: (data: unknown): ValidationResult<z.infer<typeof schema>> => 
      validate(schema, data),
    
    validateField: (field: keyof T, value: unknown): { valid: boolean; error?: string } => {
      const fieldSchema = schema.shape[field]
      if (!fieldSchema) {
        return { valid: true }
      }
      return validateField(fieldSchema as z.ZodSchema, value)
    },
  }
}

// Pre-built validators for common forms
export const loginValidator = createFormValidator(LoginSchema)
export const signUpValidator = createFormValidator(SignUpSchema)
export const nutritionGoalsValidator = createFormValidator(NutritionGoalsSchema)
