import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecipeSuggestionRequest {
  user_input: string;
  user_id: string;
  is_pro?: boolean;
  nutrition_goals?: {
    dailyTargets: {
      calories: number;
      proteinGrams: number;
      carbGrams: number;
      fatGrams: number;
      fibreGrams: number;
    };
    focusAreas?: string[];
    goalType?: string;
  };
}

interface RecipeSuggestion {
  name: string;
  description: string;
  estimated_calories?: number;
  estimated_protein?: number;
  tags?: string[];
  cuisine_type?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
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

    const { user_input, user_id, is_pro, nutrition_goals } = await req.json() as RecipeSuggestionRequest;

    if (!user_input || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_input and user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!is_pro) {
      return new Response(
        JSON.stringify({ error: 'Recipe suggestions are a Pro feature.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Generating recipe suggestions for user ${user_id} with input: ${user_input.substring(0, 100)}...`);

    // Generate 5 recipe suggestions based on user input and nutrition goals
    const suggestions = generateSuggestions(user_input, nutrition_goals);

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Recipe suggestions generation error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate recipe suggestions',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateSuggestions(
  userInput: string,
  nutritionGoals?: RecipeSuggestionRequest['nutrition_goals']
): RecipeSuggestion[] {
  const inputLower = userInput.toLowerCase();
  const suggestions: RecipeSuggestion[] = [];

  // Extract key ingredients or preferences from user input
  const hasChicken = inputLower.includes('chicken');
  const hasBeef = inputLower.includes('beef') || inputLower.includes('steak');
  const hasFish = inputLower.includes('fish') || inputLower.includes('salmon') || inputLower.includes('tuna');
  const hasVegetables = inputLower.includes('vegetable') || inputLower.includes('veggie') || inputLower.includes('salad');
  const hasPasta = inputLower.includes('pasta') || inputLower.includes('noodle');
  const hasRice = inputLower.includes('rice');
  const wantsHealthy = inputLower.includes('healthy') || inputLower.includes('light') || inputLower.includes('low');
  const wantsQuick = inputLower.includes('quick') || inputLower.includes('fast') || inputLower.includes('easy');
  const wantsProtein = inputLower.includes('protein') || inputLower.includes('high protein');
  const wantsLowCarb = inputLower.includes('low carb') || inputLower.includes('keto');
  
  // Get target calories per meal (assuming 3 meals per day)
  const targetCalories = nutritionGoals?.dailyTargets?.calories 
    ? Math.round(nutritionGoals.dailyTargets.calories / 3)
    : 500;
  const targetProtein = nutritionGoals?.dailyTargets?.proteinGrams
    ? Math.round(nutritionGoals.dailyTargets.proteinGrams / 3)
    : 30;

  // Generate suggestions based on input and goals
  const baseSuggestions: RecipeSuggestion[] = [];

  // Suggestion 1: Protein-focused
  if (hasChicken || wantsProtein) {
    baseSuggestions.push({
      name: 'Grilled Lemon Herb Chicken',
      description: 'Tender chicken breast marinated in lemon and herbs, served with roasted vegetables',
      estimated_calories: targetCalories,
      estimated_protein: targetProtein,
      tags: ['Protein-heavy', 'Balanced', wantsQuick ? 'Quick & Easy' : undefined].filter(Boolean) as string[],
      cuisine_type: 'Mediterranean',
      difficulty: wantsQuick ? 'Easy' : 'Medium',
    });
  }

  // Suggestion 2: Vegetarian option
  if (hasVegetables || !hasChicken && !hasBeef && !hasFish) {
    baseSuggestions.push({
      name: 'Quinoa Power Bowl',
      description: 'Nutritious quinoa bowl with roasted vegetables, chickpeas, and tahini dressing',
      estimated_calories: Math.round(targetCalories * 0.9),
      estimated_protein: Math.round(targetProtein * 0.8),
      tags: ['Vegetarian', 'Balanced'].filter(Boolean) as string[],
      cuisine_type: 'Mediterranean',
      difficulty: 'Easy',
    });
  }

  // Suggestion 3: Pasta option
  if (hasPasta) {
    baseSuggestions.push({
      name: 'Whole Wheat Pasta Primavera',
      description: 'Colorful pasta dish with seasonal vegetables in a light olive oil sauce',
      estimated_calories: targetCalories,
      estimated_protein: Math.round(targetProtein * 0.7),
      tags: ['Vegetarian', 'Quick & Easy'].filter(Boolean) as string[],
      cuisine_type: 'Italian',
      difficulty: 'Easy',
    });
  }

  // Suggestion 4: Fish option
  if (hasFish || wantsHealthy) {
    baseSuggestions.push({
      name: 'Baked Salmon with Vegetables',
      description: 'Omega-3 rich salmon baked with herbs and served with steamed vegetables',
      estimated_calories: Math.round(targetCalories * 0.95),
      estimated_protein: targetProtein,
      tags: ['Balanced', 'Protein-heavy', 'Omega-3'].filter(Boolean) as string[],
      cuisine_type: 'Mediterranean',
      difficulty: 'Easy',
    });
  }

  // Suggestion 5: Rice-based option
  if (hasRice || !hasPasta) {
    baseSuggestions.push({
      name: 'Teriyaki Chicken Rice Bowl',
      description: 'Tender chicken glazed with teriyaki sauce over brown rice with steamed broccoli',
      estimated_calories: targetCalories,
      estimated_protein: targetProtein,
      tags: ['Protein-heavy', 'Quick & Easy'].filter(Boolean) as string[],
      cuisine_type: 'Asian',
      difficulty: 'Easy',
    });
  }

  // Fill remaining slots with generic healthy options
  const genericOptions: RecipeSuggestion[] = [
    {
      name: 'Mediterranean Stuffed Bell Peppers',
      description: 'Bell peppers stuffed with lean ground turkey, quinoa, and Mediterranean spices',
      estimated_calories: Math.round(targetCalories * 0.9),
      estimated_protein: Math.round(targetProtein * 0.9),
      tags: ['Balanced', 'Protein-heavy'],
      cuisine_type: 'Mediterranean',
      difficulty: 'Medium',
    },
    {
      name: 'Thai Curry with Vegetables',
      description: 'Aromatic Thai curry with mixed vegetables and tofu in coconut milk',
      estimated_calories: Math.round(targetCalories * 0.85),
      estimated_protein: Math.round(targetProtein * 0.7),
      tags: ['Vegetarian', 'Balanced'],
      cuisine_type: 'Thai',
      difficulty: 'Medium',
    },
    {
      name: 'Sheet Pan Chicken Fajitas',
      description: 'Spiced chicken and vegetables roasted together for an easy one-pan meal',
      estimated_calories: targetCalories,
      estimated_protein: targetProtein,
      tags: ['Protein-heavy', 'Quick & Easy'],
      cuisine_type: 'Mexican',
      difficulty: 'Easy',
    },
    {
      name: 'Lentil and Vegetable Soup',
      description: 'Hearty soup with lentils, vegetables, and herbs - perfect for meal prep',
      estimated_calories: Math.round(targetCalories * 0.8),
      estimated_protein: Math.round(targetProtein * 0.6),
      tags: ['Vegetarian', 'Balanced'],
      cuisine_type: 'International',
      difficulty: 'Easy',
    },
    {
      name: 'Greek Chicken Souvlaki',
      description: 'Marinated chicken skewers with tzatziki, served with Greek salad and pita',
      estimated_calories: targetCalories,
      estimated_protein: targetProtein,
      tags: ['Protein-heavy', 'Balanced'],
      cuisine_type: 'Greek',
      difficulty: 'Medium',
    },
  ];

  // Combine and select 5 unique suggestions
  const allSuggestions = [...baseSuggestions, ...genericOptions];
  const selectedSuggestions: RecipeSuggestion[] = [];
  const usedNames = new Set<string>();

  // First, add base suggestions
  for (const suggestion of baseSuggestions) {
    if (selectedSuggestions.length >= 5) break;
    if (!usedNames.has(suggestion.name)) {
      selectedSuggestions.push(suggestion);
      usedNames.add(suggestion.name);
    }
  }

  // Fill remaining slots with generic options
  for (const suggestion of genericOptions) {
    if (selectedSuggestions.length >= 5) break;
    if (!usedNames.has(suggestion.name)) {
      selectedSuggestions.push(suggestion);
      usedNames.add(suggestion.name);
    }
  }

  // Ensure we always return exactly 5 suggestions
  while (selectedSuggestions.length < 5) {
    const fallback: RecipeSuggestion = {
      name: `Balanced ${selectedSuggestions.length + 1} Bowl`,
      description: 'A balanced meal aligned with your nutrition goals',
      estimated_calories: targetCalories,
      estimated_protein: targetProtein,
      tags: ['Balanced'],
      cuisine_type: 'International',
      difficulty: 'Easy',
    };
    if (!usedNames.has(fallback.name)) {
      selectedSuggestions.push(fallback);
      usedNames.add(fallback.name);
    } else {
      break;
    }
  }

  return selectedSuggestions.slice(0, 5);
}






















