import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TextAnalysisRequest {
  description: string
  userId: string
  mealId?: string
}

interface NutritionAnalysis {
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  ingredients: string[]
  serving_size: string
  health_score: number
  feedback: string
  recommendations: Array<{
    type: string
    content: string
    priority: number
  }>
  missing_info?: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Parse request body
    const { description, userId, mealId }: TextAnalysisRequest = await req.json()
    
    // Validate required fields
    if (!description || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: description and userId are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate description length
    if (description.trim().length < 5) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Description too short. Please provide more details about your meal.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user goals for personalization
    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Create comprehensive prompt for text analysis
    const systemPrompt = `You are a professional nutritionist with expertise in meal analysis and personalized dietary recommendations. You excel at estimating nutrition information from meal descriptions.`

    const userPrompt = `
Analyze the following meal description and provide detailed nutrition information:

Meal Description: "${description.trim()}"

${userGoals ? `User's Health Goals:
- Goal type: ${userGoals.goal_type}
- Target calories: ${userGoals.target_calories || 'Not specified'}
- Target protein: ${userGoals.target_protein || 'Not specified'}g
- Activity level: ${userGoals.activity_level || 'Not specified'}
- Dietary restrictions: ${userGoals.dietary_restrictions?.join(', ') || 'None specified'}` : 'No user goals available'}

Please provide a comprehensive analysis in JSON format:

{
  "nutrition": {
    "calories": <estimated calories as number>,
    "protein": <grams as number>,
    "carbs": <grams as number>,
    "fat": <grams as number>,
    "fiber": <grams as number>
  },
  "ingredients": [<list of identified ingredients as strings>],
  "serving_size": "<estimated serving size as string>",
  "health_score": <1-10 rating as number>,
  "feedback": "<qualitative health assessment as string>",
  "recommendations": [
    {
      "type": "nutrition|portion|timing|alternative",
      "content": "<specific recommendation as string>",
      "priority": <1-3 as number>
    }
  ],
  "missing_info": [<what additional info would improve accuracy as strings>]
}

Provide specific, actionable recommendations based on the user's goals. Consider portion sizes, cooking methods, and ingredients mentioned. Ensure all numeric values are actual numbers, not strings.
`

    // Call OpenAI API for text analysis
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const analysisText = openaiData.choices[0].message.content
    
    let analysisResult: NutritionAnalysis
    try {
      analysisResult = JSON.parse(analysisText)
      
      // Validate the structure
      if (!analysisResult.nutrition || typeof analysisResult.nutrition.calories !== 'number') {
        throw new Error('Invalid analysis structure')
      }
      
      // Ensure reasonable bounds on nutrition values
      analysisResult.nutrition.calories = Math.max(50, Math.min(3000, analysisResult.nutrition.calories))
      analysisResult.nutrition.protein = Math.max(0, Math.min(200, analysisResult.nutrition.protein))
      analysisResult.nutrition.carbs = Math.max(0, Math.min(500, analysisResult.nutrition.carbs))
      analysisResult.nutrition.fat = Math.max(0, Math.min(150, analysisResult.nutrition.fat))
      analysisResult.nutrition.fiber = Math.max(0, Math.min(50, analysisResult.nutrition.fiber))
      
      // Ensure health score is within bounds
      analysisResult.health_score = Math.max(1, Math.min(10, analysisResult.health_score))
      
    } catch (parseError) {
      console.error('Failed to parse LLM response:', analysisText)
      
      // Provide fallback analysis based on description length and keywords
      const descriptionLower = description.toLowerCase()
      const isHealthy = descriptionLower.includes('salad') || descriptionLower.includes('vegetable') || 
                       descriptionLower.includes('fruit') || descriptionLower.includes('lean')
      
      analysisResult = {
        nutrition: {
          calories: description.length > 50 ? 600 : 400,
          protein: isHealthy ? 25 : 15,
          carbs: isHealthy ? 40 : 60,
          fat: isHealthy ? 15 : 25,
          fiber: isHealthy ? 8 : 4
        },
        ingredients: ['Unable to identify specific ingredients from description'],
        serving_size: 'Medium portion',
        health_score: isHealthy ? 7 : 5,
        feedback: 'Unable to provide detailed analysis. Please provide more specific details about ingredients, portions, and cooking methods.',
        recommendations: [{
          type: 'nutrition',
          content: 'Try to include more specific details about ingredients and portion sizes for better analysis.',
          priority: 2
        }],
        missing_info: ['Specific ingredients', 'Portion sizes', 'Cooking methods']
      }
    }

    const processingTime = Date.now() - startTime

    // Save analysis to database
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analysis_results')
      .insert({
        meal_id: mealId,
        analysis_type: 'text',
        raw_response: openaiData,
        extracted_nutrition: analysisResult,
        processing_time_ms: processingTime
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Database error saving analysis:', analysisError)
    }

    // Update meal record with analysis if mealId provided
    if (mealId && analysisResult.nutrition) {
      const { error: updateError } = await supabase
        .from('meals')
        .update({
          calories: Math.round(analysisResult.nutrition.calories),
          macros: {
            protein: Math.round(analysisResult.nutrition.protein * 10) / 10,
            carbs: Math.round(analysisResult.nutrition.carbs * 10) / 10,
            fat: Math.round(analysisResult.nutrition.fat * 10) / 10,
            fiber: Math.round(analysisResult.nutrition.fiber * 10) / 10
          },
          ingredients: analysisResult.ingredients,
          serving_estimate: analysisResult.serving_size,
          health_score: analysisResult.health_score > 7 ? 'healthy' : 
                       analysisResult.health_score > 4 ? 'moderately_healthy' : 'unhealthy',
          qualitative_feedback: analysisResult.feedback,
          ai_analysis: analysisResult,
          analysis_version: '1.0',
          processing_status: 'completed'
        })
        .eq('id', mealId)

      if (updateError) {
        console.error('Error updating meal:', updateError)
      }
    }

    // Generate personalized recommendations
    if (analysisResult.recommendations && analysisResult.recommendations.length > 0) {
      const recommendationsToInsert = analysisResult.recommendations.map(rec => ({
        user_id: userId,
        meal_id: mealId,
        recommendation_type: rec.type,
        content: rec.content,
        priority: rec.priority || 1
      }))

      const { error: recError } = await supabase
        .from('recommendations')
        .insert(recommendationsToInsert)

      if (recError) {
        console.error('Error saving recommendations:', recError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analysis_id: analysisRecord?.id,
        processing_time_ms: processingTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Text analysis error:', error)
    
    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to analyze meal description. Please try again.',
        details: Deno.env.get('DENO_ENV') === 'development' ? errorDetails : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 