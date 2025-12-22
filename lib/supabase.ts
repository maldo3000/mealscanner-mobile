import { createClient } from '@supabase/supabase-js'
import * as FileSystemLegacy from 'expo-file-system/legacy'
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

export const getAllUserMeals = async (userId: string) => {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
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

export interface MealItem {
  id: string
  meal_id: string
  item_type: 'photo' | 'text'
  image_url: string | null
  text: string | null
  quantity: number
  order_index: number
  is_hero: boolean
  ai_nutrition_per_unit: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  } | null
  ai_ingredients: string[] | null
  ai_confidence: number | null
  created_at: string
  updated_at: string
}

export interface AnalyzeMealMultiItemInput {
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
  items: AnalyzeMealMultiItemInput[]
}

export const analyzeMealMulti = async (payload: AnalyzeMealMultiRequest) => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-meal-multi', {
      body: payload,
    })

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const getMealItems = async (mealId: string) => {
  const { data, error } = await supabase
    .from('meal_items')
    .select('*')
    .eq('meal_id', mealId)
    .order('order_index', { ascending: true })

  return { data: (data as MealItem[]) ?? null, error }
}

export const updateMealItemQuantity = async (mealItemId: string, quantity: number) => {
  const normalizedQuantity = Math.max(1, Math.floor(quantity))

  const { data, error } = await supabase
    .from('meal_items')
    .update({ quantity: normalizedQuantity })
    .eq('id', mealItemId)
    .select()
    .single()

  return { data: (data as MealItem) ?? null, error }
}

export const setMealHeroItem = async (mealId: string, mealItemId: string) => {
  const { data, error } = await supabase.rpc('set_meal_hero_item', {
    p_meal_id: mealId,
    p_meal_item_id: mealItemId,
  })

  return { data, error }
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

// Audio upload helper function
export const uploadAudioFile = async (uri: string, fileName: string, userId: string) => {
  try {
    // Use the same FormData approach as image upload
    // For React Native, we pass the file URI directly
    const formData = new FormData()
    formData.append('file', {
      uri: uri,
      type: 'audio/m4a',
      name: fileName,
    } as any)
    
    const { data, error } = await supabase.storage
      .from('audio-recordings')
      .upload(`${userId}/${fileName}`, formData, {
        contentType: 'audio/m4a',
        upsert: false
      })
    
    if (error) {
      console.error('Audio upload error:', error)
      // Log more details for debugging
      console.error('Upload error details:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: (error as any).error
      })
      return { data: null, error }
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(`${userId}/${fileName}`)
    
    return { data: { ...data, publicUrl }, error: null }
  } catch (error) {
    console.error('Audio upload error:', error)
    return { data: null, error }
  }
}

// Speech-to-text function (via storage URL)
export const transcribeAudio = async (audioUrl: string, userId: string, language?: string) => {
  try {
    console.log('🎤 Starting speech-to-text for:', { audioUrl: audioUrl.substring(0, 50) + '...', userId })
    
    const { data, error } = await supabase.functions.invoke('speech-to-text', {
      body: {
        audio_url: audioUrl,
        user_id: userId,
        language: language || 'en'
      }
    })

    if (error) {
      console.error('Speech-to-text error:', error)
      throw error
    }
    
    console.log('🎤 Speech-to-text success:', data?.transcript?.substring(0, 50) + '...')
    return { data, error: null }
  } catch (error) {
    console.error('Speech-to-text error:', error)
    return { data: null, error }
  }
}

// Direct transcription function (bypasses storage, sends base64 directly)
export const transcribeAudioDirect = async (audioUri: string, userId: string, language?: string) => {
  try {
    console.log('🎤 Starting direct speech-to-text for:', { audioUri: audioUri.substring(0, 50) + '...', userId })
    
    // Read audio file as base64 using legacy API (for compatibility)
    const base64Audio = await FileSystemLegacy.readAsStringAsync(audioUri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    })

    console.log('🎤 Audio file read, size:', base64Audio.length, 'characters')

    // Create a data URL
    const dataUrl = `data:audio/m4a;base64,${base64Audio}`
    
    console.log('🎤 Invoking speech-to-text-direct edge function...')
    console.log('🎤 Request payload size:', dataUrl.length, 'characters')
    
    try {
      const { data, error } = await supabase.functions.invoke('speech-to-text-direct', {
        body: {
          audio_data: dataUrl,
          user_id: userId,
          language: language || 'en'
        }
      })

      // When edge function returns non-2xx, Supabase puts error response in data field
      // Check data first for error messages (this happens when function returns 500 with JSON body)
      if (data && typeof data === 'object') {
        if ('error' in data) {
          const errorFromData = (data as any).error
          console.error('Edge function returned error in data:', errorFromData)
          // Check if it's a deployment issue
          if (typeof errorFromData === 'string' && (errorFromData.includes('not found') || errorFromData.includes('404'))) {
            throw new Error('speech-to-text-direct edge function not deployed. Please run: supabase functions deploy speech-to-text-direct')
          }
          if (typeof errorFromData === 'string' && errorFromData.includes('OpenAI API key')) {
            throw new Error('OpenAI API key not configured in Supabase. Please set it: supabase secrets set OPENAI_API_KEY=your-key')
          }
          throw new Error(errorFromData)
        }
        // Some functions return { success: false, error: ... }
        if ('success' in data && data.success === false && 'error' in data) {
          const errorFromData = (data as any).error
          console.error('Edge function returned failure in data:', errorFromData)
          throw new Error(errorFromData)
        }
      }

      if (error) {
        console.error('Direct speech-to-text error:', error)
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
        
        // Try to extract error message from various possible locations
        let errorMessage = error.message || 'Unknown error'
        const errorObj = error as any
        
        // Check error context/response - Supabase puts response details here including status code
        let statusCode = errorObj.statusCode || errorObj.status
        if (errorObj.context) {
          try {
            const contextData = typeof errorObj.context === 'string' 
              ? JSON.parse(errorObj.context) 
              : errorObj.context
            console.log('Error context data:', contextData)
            
            // Extract status code from context (response object has status property)
            // The status is directly in contextData.status
            if (contextData && typeof contextData === 'object') {
              if ('status' in contextData && contextData.status !== undefined) {
                statusCode = Number(contextData.status) || contextData.status
                console.log('Found status code in context:', statusCode)
              }
              // Also check URL for function name to confirm it's a 404
              if (contextData.url && contextData.url.includes('speech-to-text-direct') && !statusCode) {
                statusCode = 404
                console.log('Detected 404 from URL context')
              }
            }
            
            if (contextData?.error) {
              errorMessage = contextData.error
            } else if (contextData?.message) {
              errorMessage = contextData.message
            } else if (typeof contextData === 'string') {
              errorMessage = contextData
            }
          } catch (e) {
            console.warn('Could not parse error context:', e)
          }
        }
        
        // Check status codes - 404 means function not deployed
        console.log('Final error status code:', statusCode)
        
        if (statusCode === 404 || statusCode === '404' || errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Function not found')) {
          throw new Error('speech-to-text-direct edge function not deployed. Please run: supabase functions deploy speech-to-text-direct')
        }
        
        if (statusCode === 500 || statusCode === 502 || statusCode === 503 || errorMessage.includes('500')) {
          if (errorMessage.includes('OpenAI API key') || errorMessage.includes('not configured')) {
            throw new Error('OpenAI API key not configured in Supabase. Please set it: supabase secrets set OPENAI_API_KEY=your-key')
          }
          throw new Error(`Edge function server error (${statusCode || 'unknown'}): ${errorMessage}. Check Supabase function logs: supabase functions logs speech-to-text-direct`)
        }
        
        // If we have data but also error, data might contain the actual error message
        if (data && typeof data === 'object') {
          if ('error' in data) {
            errorMessage = (data as any).error
          } else if ('message' in data) {
            errorMessage = (data as any).message
          }
        }
        
        throw new Error(`Edge function error (${statusCode || 'unknown'}): ${errorMessage}`)
      }
      
      if (!data || !data.transcript) {
        console.error('Invalid response data:', data)
        throw new Error('Edge function returned invalid response: missing transcript')
      }
      
      console.log('🎤 Direct speech-to-text success:', data?.transcript?.substring(0, 50) + '...')
      return { data, error: null }
    } catch (invokeError) {
      // Catch any errors from the invoke call itself
      console.error('Function invoke error:', invokeError)
      const err = invokeError instanceof Error ? invokeError : new Error(String(invokeError))
      return { data: null, error: err }
    }
  } catch (error) {
    console.error('Direct speech-to-text error:', error)
    return { data: null, error }
  }
}

// Recipe Generator Functions
export const generateRecipeSuggestions = async (
  userInput: string,
  userId: string,
  nutritionGoals?: {
    dailyTargets: {
      calories: number;
      proteinGrams: number;
      carbGrams: number;
      fatGrams: number;
      fibreGrams: number;
    };
    focusAreas?: string[];
    goalType?: string;
  }
) => {
  try {
    console.log('🔍 Starting recipe suggestions generation for:', { userInput: userInput.substring(0, 50) + '...', userId });
    
    const { data, error } = await supabase.functions.invoke('generate-recipe-suggestions', {
      body: {
        user_input: userInput,
        user_id: userId,
        nutrition_goals: nutritionGoals,
      }
    })

    if (error) {
      console.error('Recipe suggestions generation error:', error)
      throw error
    }
    
    console.log('🔍 Recipe suggestions generation success:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Recipe suggestions generation error:', error)
    return { data: null, error }
  }
}

export const generateRecipeFromSuggestion = async (
  suggestion: {
    name: string;
    description: string;
    estimated_calories?: number;
    estimated_protein?: number;
    tags?: string[];
    cuisine_type?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
  },
  userId: string,
  nutritionGoals?: {
    dailyTargets: {
      calories: number;
      proteinGrams: number;
      carbGrams: number;
      fatGrams: number;
      fibreGrams: number;
    };
    focusAreas?: string[];
  }
) => {
  try {
    console.log('🔍 Starting full recipe generation for:', { recipeName: suggestion.name, userId });
    
    const { data, error } = await supabase.functions.invoke('generate-recipe-from-suggestion', {
      body: {
        suggestion,
        user_id: userId,
        nutrition_goals: nutritionGoals,
      }
    })

    if (error) {
      console.error('Full recipe generation error:', error)
      throw error
    }
    
    console.log('🔍 Full recipe generation success:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Full recipe generation error:', error)
    return { data: null, error }
  }
} 