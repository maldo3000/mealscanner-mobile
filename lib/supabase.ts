import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { createClient } from '@supabase/supabase-js'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as FileSystemLegacy from 'expo-file-system/legacy'
import { Platform } from 'react-native'

// Configure Google Sign-In
if (Platform.OS !== 'web') {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (iosClientId || webClientId) {
    GoogleSignin.configure({
      webClientId: webClientId,
      iosClientId: iosClientId,
    });
  } else {
    console.warn('⚠️ Google Sign-In IDs missing from .env. Google Sign-In will not work.');
  }
}

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

// Social Authentication
export const signInWithApple = async () => {
  try {
    const rawNonce = await Crypto.getRandomBytesAsync(32)
    const nonce = Array.from(rawNonce)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce
    )

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: appleCredential.identityToken!,
      nonce,
    })

    return { data, error }
  } catch (e: any) {
    if (e.code === 'ERR_CANCELED') {
      return { data: null, error: null }
    }
    return { data: null, error: e }
  }
}

export const signInWithGoogle = async () => {
  try {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!iosClientId && !webClientId) {
      throw new Error('Google Sign-In is not configured. Please add client IDs to your .env file.');
    }

    await GoogleSignin.hasPlayServices();
    
    // Clear any previous Google session to ensure a fresh token
    await GoogleSignin.signOut().catch(() => {});
    
    GoogleSignin.configure({
      webClientId,
      iosClientId,
    });

    const userInfo = await GoogleSignin.signIn();
    const idToken = (userInfo as any).data?.idToken || userInfo.idToken;

    if (!idToken) {
      throw new Error('No ID token present!');
    }

    // Native Google Sign-In with Supabase
    // Note: "Skip nonce checks" is enabled in Supabase Dashboard for iOS compatibility
    // This allows the ID token to be accepted without matching the nonce
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    return { data, error };
  } catch (e: any) {
    // Handle user cancellation gracefully
    if (e.code === 'SIGN_IN_CANCELLED' || e.code === '-5') {
      return { data: null, error: null };
    }
    console.error('❌ Google Sign-In Error:', e);
    return { data: null, error: e };
  }
}

export const resendVerificationEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
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

export interface UploadImageResult {
  data: { publicUrl: string } | null;
  error: unknown;
}

/**
 * Uploads an image for recipe extraction and returns a public URL.
 * Uses the existing `meal-images` bucket, but namespaces paths under `recipes/`.
 */
export const uploadRecipeImage = async (uri: string, fileName: string, userId: string): Promise<UploadImageResult> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: fileName,
    } as any);

    const objectPath = `${userId}/recipes/${fileName}`;
    const { data, error } = await supabase.storage
      .from('meal-images')
      .upload(objectPath, formData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error || !data) return { data: null, error };

    const { data: { publicUrl } } = supabase.storage
      .from('meal-images')
      .getPublicUrl(objectPath);

    return { data: { publicUrl }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Meal helper functions
export const saveMeal = async (mealData: {
  description: string
  image_url?: string
  user_id: string
  ingredients?: string[]
  serving_estimate?: string
  calories?: number
  macros?: any
  health_score?: 'very_healthy' | 'healthy' | 'needs_improvement'
  fiber_score?: string
  qualitative_feedback?: string
  recipe?: string
  meal_type?: string
  created_at?: string
}) => {
  const { data, error } = await supabase
    .from('meals')
    .insert([mealData])
    .select()
    .single()
  
  return { data, error }
}

export const getUserMeals = async (userId: string, limit = 20, daysLimit?: number) => {
  let query = supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (daysLimit) {
    const date = new Date()
    date.setDate(date.getDate() - daysLimit)
    query = query.gte('created_at', date.toISOString())
  }
  
  const { data, error } = await query
  
  return { data, error }
}

export const getAllUserMeals = async (userId: string, daysLimit?: number) => {
  let query = supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (daysLimit) {
    const date = new Date()
    date.setDate(date.getDate() - daysLimit)
    query = query.gte('created_at', date.toISOString())
  }
  
  const { data, error } = await query
  
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
  health_score?: 'very_healthy' | 'healthy' | 'needs_improvement'
  fiber_score?: string
  qualitative_feedback?: string
  recipe?: string
  meal_type?: string
  created_at?: string
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

/**
 * Save a recipe as a meal entry in the journal
 * This allows users to log a pre-baked recipe they've cooked
 */
export const saveRecipeAsMeal = async (
  userId: string,
  recipeData: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    servings?: number;
    nutrition_per_serving: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
    };
    ingredients?: Array<{ name: string; amount: string; unit: string }>;
    tags?: string[];
  },
  servingsConsumed: number = 1
) => {
  try {
    console.log('🍳 Saving recipe as meal:', { recipeId: recipeData.id, name: recipeData.name, servings: servingsConsumed });
    
    // Calculate nutrition based on servings consumed
    const multiplier = servingsConsumed;
    const nutrition = recipeData.nutrition_per_serving;
    
    const mealData = {
      user_id: userId,
      description: recipeData.name,
      image_url: recipeData.image_url,
      calories: Math.round(nutrition.calories * multiplier),
      macros: {
        protein: Math.round(nutrition.protein * multiplier),
        carbs: Math.round(nutrition.carbs * multiplier),
        fat: Math.round(nutrition.fat * multiplier),
        fiber: nutrition.fiber ? Math.round(nutrition.fiber * multiplier) : undefined,
      },
      ingredients: recipeData.ingredients?.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`) || [],
      serving_estimate: servingsConsumed === 1 
        ? '1 serving' 
        : `${servingsConsumed} servings`,
      recipe: recipeData.id, // Link back to the recipe
      meal_type: 'meal',
      health_score: 'healthy' as const,
      qualitative_feedback: `Logged from recipe: ${recipeData.name}`,
      ai_analysis: {
        source: 'recipe',
        recipe_id: recipeData.id,
        recipe_name: recipeData.name,
        tags: recipeData.tags,
      },
      processing_status: 'completed',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('meals')
      .insert([mealData])
      .select()
      .single();

    if (error) {
      console.error('🍳 Error saving recipe as meal:', error);
      throw error;
    }

    console.log('🍳 Recipe saved as meal successfully:', data?.id);
    return { data, error: null };
  } catch (error) {
    console.error('🍳 Error saving recipe as meal:', error);
    return { data: null, error };
  }
};

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
    sugar?: number
    sodium?: number
    cholesterol?: number
    visual_analysis?: string
    estimated_weight_g?: number
    needs_review?: boolean
  } | null
  ai_ingredients: string[] | null
  ai_confidence: number | null
  created_at: string
  updated_at: string
}

export interface AnalyzeMealMultiItemInput {
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
  items: AnalyzeMealMultiItemInput[]
  isPro?: boolean
}

export const analyzeMealMulti = async (payload: AnalyzeMealMultiRequest) => {
  try {
    console.log('🔍 Invoking analyze-meal-multi with items:', payload.items.length);
    const { data, error } = await supabase.functions.invoke('analyze-meal-multi', {
      body: payload,
    })

    if (error) {
      console.error('❌ analyze-meal-multi error:', error);
      
      // Try to extract the detailed message from the response body if available
      // We use .clone() because the response body might be read multiple times
      if ((error as any).context && typeof (error as any).context.clone === 'function') {
        try {
          const responseClone = (error as any).context.clone();
          const body = await responseClone.json();
          if (body.details || body.error) {
            const detailMsg = body.details || body.error;
            console.error('❌ Server details:', detailMsg);
            throw new Error(`Edge Function Error: ${detailMsg}`);
          }
        } catch (e) {
          // If we couldn't parse the JSON, just log that we tried
          console.error('❌ Could not parse error context body');
        }
      }

      // Try to log context or detailed error info if available
      if ((error as any).context) {
        try {
          // Note: context might already be read, so we rely on the clone above for detailed body extraction
          const context = typeof (error as any).context === 'string' 
            ? JSON.parse((error as any).context) 
            : (error as any).context;
          console.error('❌ Error context details:', JSON.stringify(context, null, 2));
        } catch (e) {
          console.error('❌ Could not parse error context:', (error as any).context);
        }
      }
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ analyze-meal-multi catch error:', error);
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
  goal_type: string
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
  health_score?: 'very_healthy' | 'healthy' | 'needs_improvement'
  fiber_score?: string
  qualitative_feedback?: string
  recipe?: string
  processing_status?: string
  meal_type?: string
  created_at?: string
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
export const analyzeRecipeFromImage = async (imageUrl: string, userId: string, isPro: boolean, description?: string, sourceMealId?: string) => {
  try {
    console.log('🔍 Starting recipe image analysis for:', { imageUrl: imageUrl.substring(0, 50) + '...', userId, description, isPro });
    
    const { data, error } = await supabase.functions.invoke('analyze-recipe-image', {
      body: {
        image_url: imageUrl,
        user_id: userId,
        is_pro: isPro,
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

export const analyzeRecipeFromText = async (description: string, userId: string, isPro: boolean, sourceMealId?: string) => {
  try {
    console.log('🔍 Starting recipe text analysis for:', { description: description.substring(0, 50) + '...', userId, isPro });
    
    const { data, error } = await supabase.functions.invoke('analyze-recipe-text', {
      body: {
        description,
        user_id: userId,
        is_pro: isPro,
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

// Database Food Direct Logging (bypass AI analysis)
export interface DatabaseFoodMealData {
  id: string;
  name: string;
  brand?: string;
  source: 'usda' | 'off';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  ingredients?: string;
  servingSize: number;
  servingUnit: string;
  servingText?: string;
  barcode?: string;
  imageUrl?: string;
}

/**
 * Saves a database food item directly to the meals table without AI analysis.
 * Used for quick logging of foods from USDA or OpenFoodFacts.
 */
export const saveDatabaseMeal = async (
  userId: string,
  foodItem: DatabaseFoodMealData,
  servingMultiplier: number = 1,
  customServingGrams?: number,
  mealType?: string
) => {
  try {
    // Calculate actual nutrition based on serving
    // If customServingGrams is provided, use that; otherwise use servingSize * multiplier
    const actualServingGrams = customServingGrams ?? (foodItem.servingSize * servingMultiplier);
    const ratio = actualServingGrams / foodItem.servingSize;

    const totalCalories = Math.round(foodItem.calories * ratio);
    const totalProtein = Math.round(foodItem.protein * ratio);
    const totalCarbs = Math.round(foodItem.carbs * ratio);
    const totalFat = Math.round(foodItem.fat * ratio);
    const totalFiber = foodItem.fiber ? Math.round(foodItem.fiber * ratio) : undefined;

    // Create description from name and brand
    const description = foodItem.brand 
      ? `${foodItem.name} (${foodItem.brand})`
      : foodItem.name;

    // Parse ingredients if provided as a string
    const ingredientsList = foodItem.ingredients 
      ? foodItem.ingredients.split(',').map(i => i.trim()).filter(Boolean).slice(0, 20)
      : undefined;

    // Determine meal type if not provided
    const derivedMealType = mealType || (() => {
      const hour = new Date().getHours();
      if (hour < 11) return 'Breakfast';
      if (hour < 15) return 'Lunch';
      if (hour < 20) return 'Dinner';
      return 'Snack';
    })();

    const mealData = {
      user_id: userId,
      description,
      calories: totalCalories,
      macros: {
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        fiber: totalFiber,
      },
      ingredients: ingredientsList,
      serving_estimate: `${actualServingGrams}${foodItem.servingUnit}`,
      meal_type: derivedMealType,
      processing_status: 'completed' as const,
      // Store source info in ai_analysis field for reference
      ai_analysis: {
        source_type: 'database',
        database_source: foodItem.source,
        database_id: foodItem.id,
        barcode: foodItem.barcode,
        original_serving_size: foodItem.servingSize,
        original_serving_unit: foodItem.servingUnit,
        serving_multiplier: servingMultiplier,
        custom_serving_grams: customServingGrams,
      },
      image_url: foodItem.imageUrl,
    };

    console.log('📦 Saving database meal:', { description, calories: totalCalories, source: foodItem.source });

    const { data, error } = await supabase
      .from('meals')
      .insert([mealData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database meal save error:', error);
      throw error;
    }

    console.log('✅ Database meal saved with ID:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('❌ saveDatabaseMeal error:', error);
    return { data: null, error };
  }
};

// Recipe Generator Functions
export const generateRecipeSuggestions = async (
  userInput: string,
  userId: string,
  isPro: boolean,
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
    console.log('🔍 Starting recipe suggestions generation for:', { userInput: userInput.substring(0, 50) + '...', userId, isPro });
    
    const { data, error } = await supabase.functions.invoke('generate-recipe-suggestions', {
      body: {
        user_input: userInput,
        user_id: userId,
        is_pro: isPro,
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
  isPro: boolean,
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
    console.log('🔍 Starting full recipe generation for:', { suggestionName: suggestion.name, userId, isPro });
    
    const { data, error } = await supabase.functions.invoke('generate-recipe-from-suggestion', {
      body: {
        suggestion,
        user_id: userId,
        is_pro: isPro,
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