import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

// Only import AsyncStorage on native platforms
let AsyncStorage: any = null
if (Platform.OS !== 'web') {
  AsyncStorage = require('@react-native-async-storage/async-storage').default
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Only use AsyncStorage on native platforms
    ...(Platform.OS !== 'web' && AsyncStorage ? {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    } : {}),
    detectSessionInUrl: false,
  },
})

// Auth helper functions
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Email/Password Authentication
export const signUpWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: email.split('@')[0], // Use part before @ as default name
      }
    }
  })
  return { data, error }
}

export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// Magic Link Authentication (optional)
export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })
  return { data, error }
}

// Profile helper functions
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const updateUserProfile = async (userId: string, updates: {
  full_name?: string
  avatar_url?: string
  nutrition_goal?: string
  show_metrics?: boolean
  subscription_tier?: 'free' | 'premium' | 'pro'
}) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}

// Image upload helper functions
export const uploadMealImage = async (uri: string, fileName: string, userId: string) => {
  try {
    // Create FormData for React Native
    const formData = new FormData()
    formData.append('file', {
      uri: uri,
      type: 'image/jpeg',
      name: fileName,
    } as any)
    
    const { data, error } = await supabase.storage
      .from('meal-images')
      .upload(`${userId}/${fileName}`, formData, {
        contentType: 'image/jpeg',
        upsert: false
      })
    
    if (error) return { data: null, error }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('meal-images')
      .getPublicUrl(`${userId}/${fileName}`)
    
    return { data: { ...data, publicUrl }, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Meal helper functions
export const saveMeal = async (mealData: {
  description: string
  image_url?: string
  user_id: string
  ingredients?: string[]
  serving_estimate?: string
  calories?: number
  macros?: any
  health_score?: 'healthy' | 'moderately_healthy' | 'unhealthy'
  fiber_score?: string
  qualitative_feedback?: string
  recipe?: string
}) => {
  const { data, error } = await supabase
    .from('meals')
    .insert([mealData])
    .select()
    .single()
  
  return { data, error }
}

export const getUserMeals = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return { data, error }
}

export const getMealById = async (mealId: string) => {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('id', mealId)
    .single()
  
  return { data, error }
}

export const updateMeal = async (mealId: string, updates: {
  description?: string
  image_url?: string
  ingredients?: string[]
  serving_estimate?: string
  calories?: number
  macros?: any
  health_score?: 'healthy' | 'moderately_healthy' | 'unhealthy'
  fiber_score?: string
  qualitative_feedback?: string
  recipe?: string
}) => {
  const { data, error } = await supabase
    .from('meals')
    .update(updates)
    .eq('id', mealId)
    .select()
    .single()
  
  return { data, error }
}

export const deleteMeal = async (mealId: string) => {
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealId)
  
  return { error }
} 

// AI Analysis Functions
export const analyzeImageMeal = async (imageUrl: string, userId: string, mealId?: string, description?: string) => {
  try {
    console.log('🔍 Starting image analysis for:', { imageUrl: imageUrl.substring(0, 50) + '...', userId, description });
    
    const { data, error } = await supabase.functions.invoke('analyze-meal-image', {
      body: {
        imageUrl,
        userId,
        mealId,
        description
      }
    })

    if (error) {
      console.error('Image analysis error:', error)
      throw error
    }
    
    console.log('🔍 Image analysis success:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Image analysis error:', error)
    return { data: null, error }
  }
}

export const analyzeTextMeal = async (description: string, userId: string, mealId?: string) => {
  try {
    console.log('🔍 Starting text analysis for:', { description: description.substring(0, 50) + '...', userId });
    
    const { data, error } = await supabase.functions.invoke('analyze-meal-text', {
      body: {
        description,
        userId,
        mealId
      }
    })

    if (error) {
      console.error('Text analysis error:', error)
      throw error
    }
    
    console.log('🔍 Text analysis success:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Text analysis error:', error)
    return { data: null, error }
  }
}

// User Goals Functions
export const saveUserGoals = async (userId: string, goals: {
  goal_type: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'health'
  target_calories?: number
  target_protein?: number
  target_carbs?: number
  target_fat?: number
  target_fiber?: number
  dietary_restrictions?: string[]
  activity_level?: string
}) => {
  const { data, error } = await supabase
    .from('user_goals')
    .upsert({
      user_id: userId,
      ...goals,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  return { data, error }
}

export const getUserGoals = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return { data, error }
}

// Recommendations Functions
export const getUserRecommendations = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

export const getUnreadRecommendations = async (userId: string) => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  return { data, error }
}

export const markRecommendationAsRead = async (recommendationId: string) => {
  const { error } = await supabase
    .from('recommendations')
    .update({ is_read: true })
    .eq('id', recommendationId)

  return { error }
}

export const markAllRecommendationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('recommendations')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  return { error }
}

// Analysis Results Functions
export const getAnalysisResults = async (mealId: string) => {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('meal_id', mealId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const getMealAnalysisStats = async (userId: string, days = 30) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('analysis_results')
    .select(`
      *,
      meals!inner(user_id, created_at)
    `)
    .eq('meals.user_id', userId)
    .gte('meals.created_at', startDate.toISOString())

  return { data, error }
}

// Enhanced meal functions with AI analysis support
export const saveMealWithAnalysis = async (mealData: {
  description: string
  image_url?: string
  user_id: string
  ingredients?: string[]
  serving_estimate?: string
  calories?: number
  macros?: any
  health_score?: 'healthy' | 'moderately_healthy' | 'unhealthy'
  fiber_score?: string
  qualitative_feedback?: string
  recipe?: string
  processing_status?: string
}) => {
  const { data, error } = await supabase
    .from('meals')
    .insert([{
      ...mealData,
      processing_status: mealData.processing_status || 'pending'
    }])
    .select()
    .single()
  
  return { data, error }
}

export const getMealsWithAnalysis = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('meals')
    .select(`
      *,
      analysis_results(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

// Recipe Analysis Functions
export const analyzeRecipeFromImage = async (imageUrl: string, userId: string, description?: string, sourceMealId?: string) => {
  try {
    console.log('🔍 Starting recipe image analysis for:', { imageUrl: imageUrl.substring(0, 50) + '...', userId, description });
    
    const { data, error } = await supabase.functions.invoke('analyze-recipe-image', {
      body: {
        image_url: imageUrl,
        user_id: userId,
        description,
        source_meal_id: sourceMealId
      }
    })

    if (error) {
      console.error('Recipe image analysis error:', error)
      throw error
    }
    
    console.log('🔍 Recipe image analysis success:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Recipe image analysis error:', error)
    return { data: null, error }
  }
}

export const analyzeRecipeFromText = async (description: string, userId: string, sourceMealId?: string) => {
  try {
    console.log('🔍 Starting recipe text analysis for:', { description: description.substring(0, 50) + '...', userId });
    
    const { data, error } = await supabase.functions.invoke('analyze-recipe-text', {
      body: {
        description,
        user_id: userId,
        source_meal_id: sourceMealId
      }
    })

    if (error) {
      console.error('Recipe text analysis error:', error)
      throw error
    }
    
    console.log('🔍 Recipe text analysis success:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Recipe text analysis error:', error)
    return { data: null, error }
  }
}

// Recipe CRUD Functions
export const getUserRecipes = async (userId: string) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export const getRecipeById = async (recipeId: string) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single()
  
  return { data, error }
}

export const getRecipeWithDetails = async (recipeId: string) => {
  console.log('🍳 Supabase: getRecipeWithDetails called with ID:', recipeId);
  
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single()

  console.log('🍳 Supabase: Recipe query result:', { recipe: !!recipe, error: recipeError });
  
  if (recipeError) {
    console.error('🍳 Supabase: Recipe error details:', JSON.stringify(recipeError));
    return { data: null, error: recipeError }
  }

  if (!recipe) {
    console.error('🍳 Supabase: No recipe found for ID:', recipeId);
    return { data: null, error: { message: 'Recipe not found' } }
  }

  console.log('🍳 Supabase: Found recipe:', recipe.name, 'ID:', recipe.id);

  // Get ingredients
  console.log('🍳 Supabase: Fetching ingredients for recipe ID:', recipeId);
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('order_index')

  console.log('🍳 Supabase: Ingredients query result:', { count: ingredients?.length || 0, error: ingredientsError });

  // Get instructions
  console.log('🍳 Supabase: Fetching instructions for recipe ID:', recipeId);
  const { data: instructions, error: instructionsError } = await supabase
    .from('recipe_instructions')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('step_number')

  console.log('🍳 Supabase: Instructions query result:', { count: instructions?.length || 0, error: instructionsError });

  if (ingredientsError || instructionsError) {
    console.error('🍳 Supabase: Error fetching ingredients/instructions:', { ingredientsError, instructionsError });
    return { data: null, error: ingredientsError || instructionsError }
  }

  const result = {
    ...recipe,
    ingredients: ingredients || [],
    instructions: instructions || []
  };

  console.log('🍳 Supabase: Returning recipe with details:', {
    name: result.name,
    ingredientsCount: result.ingredients.length,
    instructionsCount: result.instructions.length,
    hasAiAnalysis: !!result.ai_analysis
  });

  return {
    data: result,
    error: null
  }
}

export const updateRecipe = async (recipeId: string, updates: any) => {
  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', recipeId)
    .select()
    .single()
  
  return { data, error }
}

export const deleteRecipe = async (recipeId: string) => {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)
  
  return { error }
}

export const toggleRecipeFavorite = async (recipeId: string, isFavorite: boolean) => {
  const { data, error } = await supabase
    .from('recipes')
    .update({ is_favorite: isFavorite })
    .eq('id', recipeId)
    .select()
    .single()
  
  return { data, error }
}

export const searchRecipes = async (userId: string, query: string) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .or(`name.ilike.%${query}%,cuisine_type.ilike.%${query}%,tags.cs.{${query}}`)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export const getRecipesByCategory = async (userId: string, categoryId: string) => {
  const { data, error } = await supabase
    .from('recipe_category_assignments')
    .select(`
      recipes (*)
    `)
    .eq('category_id', categoryId)
    .eq('recipes.user_id', userId)
  
  return { data, error }
}

export const getFavoriteRecipes = async (userId: string) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_favorite', true)
    .order('created_at', { ascending: false })
  
  return { data, error }
} 