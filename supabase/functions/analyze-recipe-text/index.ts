import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyAuth, createUnauthorizedResponse, validateUserMatch } from '../_shared/auth.ts';
import { getSmartCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface RecipeTextAnalysisRequest {
  description: string;
  user_id: string;
  is_pro?: boolean;
  source_meal_id?: string;
}

interface RecipeAnalysisResponse {
  name: string;
  description?: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    notes?: string;
  }>;
  instructions: string[];
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  servings?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  cuisine_type?: string;
  tags?: string[];
  nutrition_per_serving?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

Deno.serve(async (req) => {
  // Get request-aware CORS headers
  const corsHeaders = getSmartCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Verify JWT authentication first
    const auth = await verifyAuth(req);
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders);
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { description, user_id: payload_user_id, is_pro, source_meal_id } = await req.json() as RecipeTextAnalysisRequest;

    // Use authenticated user ID, validate if payload specifies one
    if (payload_user_id && !validateUserMatch(auth.userId, payload_user_id)) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch: you can only access your own data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user_id = auth.userId;

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: description' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!is_pro) {
      return new Response(
        JSON.stringify({ error: 'Recipe generation is a Pro feature.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting text recipe analysis for user ${user_id} with description: ${description.substring(0, 100)}...`);

    // TODO: Replace with actual AI service call
    // For now, we'll analyze the text and return mock recipe data
    const mockRecipeAnalysis: RecipeAnalysisResponse = {
      name: extractRecipeName(description),
      description: "A delicious recipe recreated from your meal description",
      ingredients: extractIngredients(description),
      instructions: generateInstructions(description),
      prep_time: estimateTime(description, 'prep'),
      cook_time: estimateTime(description, 'cook'),
      total_time: estimateTime(description, 'total'),
      servings: estimateServings(description),
      difficulty: estimateDifficulty(description),
      cuisine_type: detectCuisine(description),
      tags: generateTags(description),
      nutrition_per_serving: estimateNutrition(description)
    };

    // Save the recipe to the database
    const { data: recipe, error: recipeError } = await supabaseClient
      .from('recipes')
      .insert({
        user_id,
        name: mockRecipeAnalysis.name,
        description: mockRecipeAnalysis.description,
        prep_time: mockRecipeAnalysis.prep_time,
        cook_time: mockRecipeAnalysis.cook_time,
        total_time: mockRecipeAnalysis.total_time,
        servings: mockRecipeAnalysis.servings,
        difficulty: mockRecipeAnalysis.difficulty,
        cuisine_type: mockRecipeAnalysis.cuisine_type,
        source_meal_id,
        source_type: 'text',
        ai_analysis: mockRecipeAnalysis,
        nutrition_per_serving: mockRecipeAnalysis.nutrition_per_serving,
        tags: mockRecipeAnalysis.tags,
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Error saving recipe:', recipeError);
      throw recipeError;
    }

    console.log('Recipe saved with ID:', recipe.id);

    // Save ingredients
    if (mockRecipeAnalysis.ingredients && mockRecipeAnalysis.ingredients.length > 0) {
      const ingredientsToInsert = mockRecipeAnalysis.ingredients.map((ingredient, index) => ({
        recipe_id: recipe.id,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        notes: ingredient.notes,
        order_index: index,
      }));

      const { error: ingredientsError } = await supabaseClient
        .from('recipe_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) {
        console.error('Error saving ingredients:', ingredientsError);
      }
    }

    // Save instructions
    if (mockRecipeAnalysis.instructions && mockRecipeAnalysis.instructions.length > 0) {
      const instructionsToInsert = mockRecipeAnalysis.instructions.map((instruction, index) => ({
        recipe_id: recipe.id,
        step_number: index + 1,
        instruction,
      }));

      const { error: instructionsError } = await supabaseClient
        .from('recipe_instructions')
        .insert(instructionsToInsert);

      if (instructionsError) {
        console.error('Error saving instructions:', instructionsError);
      }
    }

    console.log('Text recipe analysis completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        recipe_id: recipe.id,
        analysis: mockRecipeAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Text recipe analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze recipe from text',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions for basic text analysis (to be replaced with actual AI)
function extractRecipeName(description: string): string {
  const keywords = ['recipe', 'dish', 'meal', 'food'];
  const words = description.toLowerCase().split(' ');
  
  // Look for food names in the description
  const foodWords = words.filter(word => 
    !keywords.includes(word) && 
    word.length > 3 && 
    !['with', 'and', 'the', 'for', 'this', 'that'].includes(word)
  );
  
  if (foodWords.length > 0) {
    return foodWords.slice(0, 3).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Recipe';
  }
  
  return 'Delicious Meal Recipe';
}

function extractIngredients(description: string): Array<{name: string, amount: string, unit: string, notes?: string}> {
  // Simple ingredient extraction based on common patterns
  const commonIngredients = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tofu',
    'rice', 'pasta', 'noodles', 'bread',
    'onion', 'garlic', 'tomato', 'carrot', 'potato',
    'oil', 'butter', 'salt', 'pepper', 'herbs', 'spices'
  ];
  
  const foundIngredients = commonIngredients.filter(ingredient => 
    description.toLowerCase().includes(ingredient)
  );
  
  return foundIngredients.map(ingredient => ({
    name: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
    amount: '1',
    unit: getDefaultUnit(ingredient),
    notes: undefined
  }));
}

function getDefaultUnit(ingredient: string): string {
  const units: Record<string, string> = {
    'chicken': 'piece',
    'beef': 'piece',
    'fish': 'fillet',
    'rice': 'cup',
    'pasta': 'cup',
    'onion': 'medium',
    'garlic': 'clove',
    'oil': 'tbsp',
    'salt': 'tsp',
    'pepper': 'tsp'
  };
  
  return units[ingredient] || 'piece';
}

function generateInstructions(description: string): string[] {
  // Generate basic cooking instructions
  return [
    'Prepare all ingredients by washing, chopping, and measuring',
    'Heat cooking surface to appropriate temperature',
    'Cook ingredients according to your meal description',
    'Season with salt, pepper, and other seasonings to taste',
    'Continue cooking until ingredients are properly cooked',
    'Serve hot and enjoy your delicious meal'
  ];
}

function estimateTime(description: string, type: 'prep' | 'cook' | 'total'): string {
  const quickWords = ['quick', 'fast', 'simple', 'easy'];
  const slowWords = ['slow', 'braised', 'roasted', 'baked'];
  
  const isQuick = quickWords.some(word => description.toLowerCase().includes(word));
  const isSlow = slowWords.some(word => description.toLowerCase().includes(word));
  
  if (type === 'prep') {
    return isQuick ? '10 min' : '15 min';
  } else if (type === 'cook') {
    return isSlow ? '45 min' : isQuick ? '15 min' : '25 min';
  } else {
    return isSlow ? '60 min' : isQuick ? '25 min' : '40 min';
  }
}

function estimateServings(description: string): number {
  if (description.toLowerCase().includes('single') || description.toLowerCase().includes('one')) {
    return 1;
  } else if (description.toLowerCase().includes('family') || description.toLowerCase().includes('large')) {
    return 4;
  }
  return 2;
}

function estimateDifficulty(description: string): 'Easy' | 'Medium' | 'Hard' {
  const easyWords = ['simple', 'easy', 'quick', 'basic'];
  const hardWords = ['complex', 'difficult', 'advanced', 'technique'];
  
  if (easyWords.some(word => description.toLowerCase().includes(word))) {
    return 'Easy';
  } else if (hardWords.some(word => description.toLowerCase().includes(word))) {
    return 'Hard';
  }
  return 'Medium';
}

function detectCuisine(description: string): string {
  const cuisineKeywords: Record<string, string> = {
    'italian': 'Italian',
    'pasta': 'Italian',
    'pizza': 'Italian',
    'chinese': 'Chinese',
    'stir fry': 'Asian',
    'sushi': 'Japanese',
    'curry': 'Indian',
    'tacos': 'Mexican',
    'salsa': 'Mexican',
    'french': 'French'
  };
  
  for (const [keyword, cuisine] of Object.entries(cuisineKeywords)) {
    if (description.toLowerCase().includes(keyword)) {
      return cuisine;
    }
  }
  
  return 'International';
}

function generateTags(description: string): string[] {
  const tags: string[] = [];
  
  if (description.toLowerCase().includes('healthy') || description.toLowerCase().includes('nutritious')) {
    tags.push('Balanced');
  }
  if (description.toLowerCase().includes('quick') || description.toLowerCase().includes('fast')) {
    tags.push('Quick & Easy');
  }
  if (description.toLowerCase().includes('vegetarian') || description.toLowerCase().includes('veggie')) {
    tags.push('Vegetarian');
  }
  if (description.toLowerCase().includes('protein')) {
    tags.push('High-Protein');
  }
  
  return tags.length > 0 ? tags : ['Homemade'];
}

function estimateNutrition(description: string): {calories: number, protein: number, carbs: number, fat: number, fiber: number, sugar: number, sodium: number} {
  // Basic nutrition estimation based on description
  let calories = 300;
  let protein = 20;
  let carbs = 25;
  let fat = 15;
  
  if (description.toLowerCase().includes('meat') || description.toLowerCase().includes('protein')) {
    protein += 10;
    calories += 50;
  }
  if (description.toLowerCase().includes('rice') || description.toLowerCase().includes('pasta')) {
    carbs += 20;
    calories += 80;
  }
  if (description.toLowerCase().includes('oil') || description.toLowerCase().includes('fried')) {
    fat += 10;
    calories += 90;
  }
  
  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: 5,
    sugar: 8,
    sodium: 400
  };
} 