import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getLLMRouter } from '../_shared/llm/router.ts';
import type { LLMConfig } from '../_shared/llm/types.ts';
import { verifyAuth, createUnauthorizedResponse, validateUserMatch } from '../_shared/auth.ts';
import { getSmartCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface RecipeAnalysisRequest {
  image_url: string;
  user_id: string;
  is_pro?: boolean;
  description?: string;
  source_meal_id?: string;
  llm?: LLMConfig;
}

interface RecipeAnalysisResponse {
  name: string;
  description?: string;
  visual_analysis: string;
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

Deno.serve(async (req: Request) => {
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

    const { image_url, user_id: payload_user_id, is_pro, description, source_meal_id, llm } = await req.json() as RecipeAnalysisRequest;
    
    // Use authenticated user ID, validate if payload specifies one
    if (payload_user_id && !validateUserMatch(auth.userId, payload_user_id)) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch: you can only access your own data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user_id = auth.userId;

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: image_url' }),
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

    console.log(`Starting recipe analysis for user ${user_id} with image: ${image_url}`);

    // Create comprehensive recipe analysis prompt
    const systemPrompt = `You are a professional chef and recipe developer with expertise in analyzing food images to create detailed, accurate recipes. Analyze the provided meal image and extract a complete recipe that would recreate this dish.`;

    const userPrompt = `
Analyze this food image and provide a complete recipe to recreate this dish. 

Follow this Chain of Thought (Volume First) process:
1. IDENTIFY: Precisely identify the dish and all visible ingredients.
2. SPATIAL REFERENCE: Compare the dish's size to reference objects in the photo (e.g., standard 10-inch plate, fork, glass, or the user's hand) to estimate serving sizes.
3. VOLUME/WEIGHT: Estimate the physical volume and weight of the ingredients.
4. CALCULATE: Only after estimating portions, calculate the nutrition values per serving.

Please provide a JSON response with:
{
  "name": "<descriptive recipe name>",
  "description": "<brief description of the dish>",
  "visual_analysis": "<step-by-step reasoning: identification -> size relative to scale -> volume -> gram conversion for key ingredients>",
  "ingredients": [
    {
      "name": "<ingredient name>",
      "amount": "<amount>",
      "unit": "<unit (cup, tbsp, tsp, oz, g, etc.)>",
      "notes": "<optional preparation notes>"
    }
  ],
  "instructions": [
    "<step 1>",
    "<step 2>",
    "<etc.>"
  ],
  "prep_time": "<prep time in minutes>",
  "cook_time": "<cooking time in minutes>",
  "total_time": "<total time in minutes>",
  "servings": <number of servings>,
  "difficulty": "<Easy|Medium|Hard>",
  "cuisine_type": "<cuisine type>",
  "tags": ["<relevant tags like Vegetarian, Quick, etc.>"],
  "nutrition_per_serving": {
    "calories": <estimated calories>,
    "protein": <grams of protein>,
    "carbs": <grams of carbs>,
    "fat": <grams of fat>,
    "fiber": <grams of fiber>,
    "sugar": <grams of sugar>,
    "sodium": <mg of sodium>
  }
}

Make the recipe detailed and realistic. Base the difficulty on the actual complexity of the techniques required.
`;

    // Use LLM router for vision analysis
    const llmRouter = getLLMRouter();
    const chatResponse = await llmRouter.chatComplete(
      {
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: image_url, detail: "high" } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      },
      llm
    );

    const analysisText = chatResponse.content;
    
    // Create a mock openaiData structure for backward compatibility with database storage
    const openaiData = {
      model: chatResponse.model,
      choices: [{
        message: {
          content: analysisText
        }
      }],
      usage: chatResponse.usage
    };
    
    let recipeAnalysis: RecipeAnalysisResponse;
    try {
      recipeAnalysis = JSON.parse(analysisText);
      
      // Validate the structure
      if (!recipeAnalysis.name || !recipeAnalysis.ingredients || !recipeAnalysis.instructions) {
        throw new Error('Invalid recipe analysis structure');
      }
      
      console.log('Recipe analysis completed:', recipeAnalysis.name);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', analysisText);
      throw new Error('Failed to parse recipe analysis from AI');
    }

    // Save the recipe to the database
    const { data: recipe, error: recipeError } = await supabaseClient
      .from('recipes')
      .insert({
        user_id,
        name: recipeAnalysis.name,
        description: recipeAnalysis.description,
        image_url,
        prep_time: recipeAnalysis.prep_time,
        cook_time: recipeAnalysis.cook_time,
        total_time: recipeAnalysis.total_time,
        servings: recipeAnalysis.servings,
        difficulty: recipeAnalysis.difficulty,
        cuisine_type: recipeAnalysis.cuisine_type,
        source_meal_id,
        source_type: 'image',
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
        // Don't throw here, recipe is already saved
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
        // Don't throw here, recipe is already saved
      }
    }

    console.log('Recipe analysis completed successfully');

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

  } catch (error: any) {
    console.error('Recipe analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze recipe',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 