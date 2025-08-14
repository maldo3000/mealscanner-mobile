import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  imageUrl: string
  userId: string
  mealId?: string
  description?: string
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Parse request body
    const { imageUrl, userId, mealId, description }: AnalysisRequest = await req.json()
    
    // Validate required fields
    if (!imageUrl || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: imageUrl and userId are required'
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

    // Get user's dietary preferences and goals
    const { data: userGoals } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Prepare comprehensive prompt for LLM
    const systemPrompt = `You are a professional nutritionist with expertise in meal analysis. Analyze the provided meal image and return detailed nutrition information in JSON format.`

    const userPrompt = `
Analyze this meal image and provide detailed nutrition information.
${description ? `User description: "${description}"` : ''}
${userGoals ? `User goals: Goal type: ${userGoals.goal_type}, Target calories: ${userGoals.target_calories}, Activity level: ${userGoals.activity_level}` : ''}

Please provide a JSON response with:
{
  "nutrition": {
    "calories": <estimated calories as number>,
    "protein": <grams as number>,
    "carbs": <grams as number>,
    "fat": <grams as number>,
    "fiber": <grams as number>
  },
  "ingredients": [<array of identified ingredients as strings>],
  "serving_size": "<estimated serving size as string>",
  "health_score": <1-10 rating as number>,
  "feedback": "<qualitative health assessment as string>",
  "recommendations": [
    {
      "type": "nutrition|portion|timing|alternative",
      "content": "<specific recommendation as string>",
      "priority": <1-3 as number>
    }
  ]
}

Provide specific numeric values and actionable recommendations. Ensure all numbers are provided as actual numbers, not strings.
`

    // Call OpenAI Vision API
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
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const analysisText = openaiData.choices[0].message.content
    
    // Parse JSON response from LLM
    let analysisResult: NutritionAnalysis
    try {
      // Remove any markdown code blocks if present
      const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim()
      analysisResult = JSON.parse(cleanedText)
      
      // Validate the structure
      if (!analysisResult.nutrition || typeof analysisResult.nutrition.calories !== 'number') {
        throw new Error('Invalid analysis structure')
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', analysisText)
      // Provide fallback analysis
      analysisResult = {
        nutrition: {
          calories: 500,
          protein: 20,
          carbs: 50,
          fat: 20,
          fiber: 5
        },
        ingredients: ['Unable to identify specific ingredients'],
        serving_size: 'Medium portion',
        health_score: 5,
        feedback: 'Unable to provide detailed analysis. Please try again with a clearer image.',
        recommendations: [{
          type: 'timing',
          content: 'Consider retaking the photo with better lighting for more accurate analysis.',
          priority: 2
        }]
      }
    }

    const processingTime = Date.now() - startTime

    // Save analysis to database
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analysis_results')
      .insert({
        meal_id: mealId,
        analysis_type: 'image',
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
    console.error('Analysis error:', error)
    
    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to analyze meal image. Please try again.',
        details: Deno.env.get('DENO_ENV') === 'development' ? errorDetails : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 