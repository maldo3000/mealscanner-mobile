import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRecipeRequest {
  suggestion: {
    name: string;
    description: string;
    estimated_calories?: number;
    estimated_protein?: number;
    tags?: string[];
    cuisine_type?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
  };
  user_id: string;
  nutrition_goals?: {
    dailyTargets: {
      calories: number;
      proteinGrams: number;
      carbGrams: number;
      fatGrams: number;
      fibreGrams: number;
    };
    focusAreas?: string[];
  };
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { suggestion, user_id, nutrition_goals } = await req.json() as GenerateRecipeRequest;

    if (!suggestion || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: suggestion and user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Generating full recipe for user ${user_id}: ${suggestion.name}`);

    // Generate full recipe details from suggestion
    const recipeAnalysis = generateFullRecipe(suggestion, nutrition_goals);

    // Save the recipe to the database
    const { data: recipe, error: recipeError } = await supabaseClient
      .from('recipes')
      .insert({
        user_id,
        name: recipeAnalysis.name,
        description: recipeAnalysis.description,
        prep_time: recipeAnalysis.prep_time,
        cook_time: recipeAnalysis.cook_time,
        total_time: recipeAnalysis.total_time,
        servings: recipeAnalysis.servings,
        difficulty: recipeAnalysis.difficulty,
        cuisine_type: recipeAnalysis.cuisine_type,
        source_type: 'generated',
        ai_analysis: recipeAnalysis,
        nutrition_per_serving: recipeAnalysis.nutrition_per_serving,
        tags: recipeAnalysis.tags,
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Error saving recipe:', recipeError);
      throw recipeError;
    }

    console.log('Recipe saved with ID:', recipe.id);

    // Save ingredients
    if (recipeAnalysis.ingredients && recipeAnalysis.ingredients.length > 0) {
      const ingredientsToInsert = recipeAnalysis.ingredients.map((ingredient, index) => ({
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
    if (recipeAnalysis.instructions && recipeAnalysis.instructions.length > 0) {
      const instructionsToInsert = recipeAnalysis.instructions.map((instruction, index) => ({
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

    console.log('Full recipe generation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        recipe_id: recipe.id,
        analysis: recipeAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Full recipe generation error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate full recipe',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateFullRecipe(
  suggestion: GenerateRecipeRequest['suggestion'],
  nutritionGoals?: GenerateRecipeRequest['nutrition_goals']
): RecipeAnalysisResponse {
  const name = suggestion.name;
  const description = suggestion.description;
  const cuisineType = suggestion.cuisine_type || 'International';
  const difficulty = suggestion.difficulty || 'Medium';
  const targetCalories = suggestion.estimated_calories || 500;
  const targetProtein = suggestion.estimated_protein || 30;

  // Generate ingredients based on recipe name and type
  const ingredients = generateIngredients(name, cuisineType, targetProtein);
  
  // Generate instructions based on recipe type and difficulty
  const instructions = generateInstructions(name, cuisineType, difficulty);
  
  // Calculate nutrition based on ingredients and targets
  const nutrition = calculateNutrition(ingredients, targetCalories, targetProtein, nutritionGoals);
  
  // Estimate times based on difficulty
  const times = estimateTimes(difficulty, instructions.length);

  return {
    name,
    description,
    ingredients,
    instructions,
    prep_time: times.prep,
    cook_time: times.cook,
    total_time: times.total,
    servings: 4,
    difficulty,
    cuisine_type: cuisineType,
    tags: suggestion.tags || [],
    nutrition_per_serving: nutrition,
  };
}

function generateIngredients(
  recipeName: string,
  cuisineType: string,
  targetProtein: number
): Array<{name: string, amount: string, unit: string, notes?: string}> {
  const nameLower = recipeName.toLowerCase();
  const ingredients: Array<{name: string, amount: string, unit: string, notes?: string}> = [];

  // Protein sources
  if (nameLower.includes('chicken')) {
    ingredients.push({ name: 'Chicken breast', amount: '500', unit: 'g', notes: 'boneless, skinless' });
  } else if (nameLower.includes('salmon') || nameLower.includes('fish')) {
    ingredients.push({ name: 'Salmon fillets', amount: '4', unit: 'pieces', notes: 'about 150g each' });
  } else if (nameLower.includes('turkey')) {
    ingredients.push({ name: 'Ground turkey', amount: '500', unit: 'g' });
  } else if (nameLower.includes('tofu') || nameLower.includes('vegetarian')) {
    ingredients.push({ name: 'Firm tofu', amount: '400', unit: 'g', notes: 'drained and pressed' });
  } else if (nameLower.includes('lentil')) {
    ingredients.push({ name: 'Brown lentils', amount: '200', unit: 'g', notes: 'dry' });
  } else if (nameLower.includes('chickpea')) {
    ingredients.push({ name: 'Chickpeas', amount: '400', unit: 'g', notes: 'canned, drained' });
  }

  // Base carbohydrates
  if (nameLower.includes('rice')) {
    ingredients.push({ name: 'Brown rice', amount: '200', unit: 'g', notes: 'dry' });
  } else if (nameLower.includes('pasta') || nameLower.includes('noodle')) {
    ingredients.push({ name: 'Whole wheat pasta', amount: '300', unit: 'g', notes: 'dry' });
  } else if (nameLower.includes('quinoa')) {
    ingredients.push({ name: 'Quinoa', amount: '200', unit: 'g', notes: 'dry' });
  }

  // Vegetables (always include some)
  if (nameLower.includes('bell pepper') || nameLower.includes('pepper')) {
    ingredients.push({ name: 'Bell peppers', amount: '3', unit: 'pieces', notes: 'mixed colors' });
  }
  if (nameLower.includes('broccoli') || !nameLower.includes('bell pepper')) {
    ingredients.push({ name: 'Broccoli', amount: '300', unit: 'g', notes: 'fresh' });
  }
  ingredients.push({ name: 'Onion', amount: '1', unit: 'medium', notes: 'diced' });
  ingredients.push({ name: 'Garlic', amount: '3', unit: 'cloves', notes: 'minced' });
  ingredients.push({ name: 'Tomatoes', amount: '2', unit: 'medium', notes: 'diced' });

  // Fats and oils
  ingredients.push({ name: 'Olive oil', amount: '2', unit: 'tbsp' });
  
  // Seasonings
  ingredients.push({ name: 'Salt', amount: '1', unit: 'tsp', notes: 'to taste' });
  ingredients.push({ name: 'Black pepper', amount: '0.5', unit: 'tsp', notes: 'freshly ground' });

  // Cuisine-specific ingredients
  if (cuisineType === 'Mediterranean' || cuisineType === 'Greek') {
    ingredients.push({ name: 'Lemon juice', amount: '2', unit: 'tbsp' });
    ingredients.push({ name: 'Fresh herbs', amount: '2', unit: 'tbsp', notes: 'oregano, thyme, or basil' });
  } else if (cuisineType === 'Asian' || cuisineType === 'Thai') {
    ingredients.push({ name: 'Soy sauce', amount: '3', unit: 'tbsp', notes: 'low sodium' });
    ingredients.push({ name: 'Ginger', amount: '1', unit: 'tbsp', notes: 'grated' });
    if (cuisineType === 'Thai') {
      ingredients.push({ name: 'Coconut milk', amount: '200', unit: 'ml', notes: 'light' });
      ingredients.push({ name: 'Curry paste', amount: '2', unit: 'tbsp' });
    }
  } else if (cuisineType === 'Mexican') {
    ingredients.push({ name: 'Lime juice', amount: '2', unit: 'tbsp' });
    ingredients.push({ name: 'Cumin', amount: '1', unit: 'tsp' });
    ingredients.push({ name: 'Chili powder', amount: '1', unit: 'tsp' });
  }

  return ingredients;
}

function generateInstructions(
  recipeName: string,
  cuisineType: string,
  difficulty: 'Easy' | 'Medium' | 'Hard'
): string[] {
  const nameLower = recipeName.toLowerCase();
  const instructions: string[] = [];

  if (difficulty === 'Easy') {
    instructions.push('Preheat your oven to 200°C (400°F) if baking, or heat a large pan over medium-high heat.');
    instructions.push('Prepare all ingredients: wash and chop vegetables, measure seasonings.');
    
    if (nameLower.includes('chicken')) {
      instructions.push('Season chicken with salt, pepper, and herbs. Cook for 6-8 minutes per side until golden and cooked through.');
    } else if (nameLower.includes('salmon') || nameLower.includes('fish')) {
      instructions.push('Season fish fillets with salt, pepper, and lemon. Bake for 12-15 minutes or pan-sear for 4-5 minutes per side.');
    } else if (nameLower.includes('sheet pan') || nameLower.includes('roast')) {
      instructions.push('Arrange all ingredients on a baking sheet. Drizzle with olive oil and season. Roast for 20-25 minutes until tender.');
    } else {
      instructions.push('Cook protein source according to recipe type, ensuring it reaches safe internal temperature.');
    }
    
    instructions.push('While protein cooks, prepare vegetables: steam, roast, or sauté until tender but still crisp.');
    instructions.push('Combine all components, adjust seasoning to taste, and serve hot.');
  } else if (difficulty === 'Medium') {
    instructions.push('Begin by marinating the protein: combine seasonings, herbs, and acid (lemon/lime) in a bowl.');
    instructions.push('Let protein marinate for at least 30 minutes, or up to 2 hours in the refrigerator.');
    instructions.push('Prepare vegetables: wash, peel, and cut into uniform pieces for even cooking.');
    instructions.push('Heat cooking oil in a large pan or preheat oven. Cook protein until golden and cooked through.');
    instructions.push('In the same pan, sauté aromatics (onion, garlic) until fragrant, then add vegetables.');
    instructions.push('Cook vegetables until tender, seasoning with salt, pepper, and herbs as you go.');
    instructions.push('Combine protein and vegetables, add any sauces or dressings, and let flavors meld for 2-3 minutes.');
    instructions.push('Garnish with fresh herbs and serve immediately.');
  } else {
    instructions.push('Prepare a multi-step marinade: combine base ingredients, then add aromatics and herbs.');
    instructions.push('Marinate protein for 2-4 hours or overnight for maximum flavor penetration.');
    instructions.push('Prepare mise en place: organize all ingredients, measure spices, and prepare cooking stations.');
    instructions.push('Use proper cooking techniques: sear protein to develop a crust, then finish cooking gently.');
    instructions.push('Cook vegetables in stages: start with aromatics, add harder vegetables, then delicate ones.');
    instructions.push('Create a pan sauce or reduction using cooking juices and aromatics.');
    instructions.push('Rest protein before serving to allow juices to redistribute.');
    instructions.push('Plate with attention to presentation: arrange components thoughtfully and garnish appropriately.');
  }

  return instructions;
}

function calculateNutrition(
  ingredients: Array<{name: string, amount: string, unit: string}>,
  targetCalories: number,
  targetProtein: number,
  nutritionGoals?: GenerateRecipeRequest['nutrition_goals']
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
} {
  // Base nutrition values (per serving, assuming 4 servings)
  let calories = targetCalories;
  let protein = targetProtein;
  let carbs = nutritionGoals?.dailyTargets?.carbGrams ? Math.round(nutritionGoals.dailyTargets.carbGrams / 3) : 50;
  let fat = nutritionGoals?.dailyTargets?.fatGrams ? Math.round(nutritionGoals.dailyTargets.fatGrams / 3) : 20;
  let fiber = nutritionGoals?.dailyTargets?.fibreGrams ? Math.round(nutritionGoals.dailyTargets.fibreGrams / 3) : 8;
  
  // Adjust based on ingredients
  const hasRice = ingredients.some(i => i.name.toLowerCase().includes('rice'));
  const hasPasta = ingredients.some(i => i.name.toLowerCase().includes('pasta'));
  const hasQuinoa = ingredients.some(i => i.name.toLowerCase().includes('quinoa'));
  const hasChicken = ingredients.some(i => i.name.toLowerCase().includes('chicken'));
  const hasFish = ingredients.some(i => i.name.toLowerCase().includes('salmon') || i.name.toLowerCase().includes('fish'));
  
  if (hasRice || hasPasta || hasQuinoa) {
    carbs += 15;
    calories += 60;
    fiber += 2;
  }
  
  if (hasChicken) {
    protein += 5;
    calories += 20;
  }
  
  if (hasFish) {
    protein += 3;
    calories += 15;
    fat += 2; // Omega-3 fats
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fiber: Math.round(fiber),
    sugar: 5,
    sodium: 600,
  };
}

function estimateTimes(
  difficulty: 'Easy' | 'Medium' | 'Hard',
  instructionCount: number
): { prep: string; cook: string; total: string } {
  const basePrep = difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 15 : 20;
  const baseCook = difficulty === 'Easy' ? 20 : difficulty === 'Medium' ? 30 : 45;
  
  const prep = basePrep + Math.floor(instructionCount * 2);
  const cook = baseCook;
  const total = prep + cook;

  return {
    prep: `${prep} min`,
    cook: `${cook} min`,
    total: `${total} min`,
  };
}










