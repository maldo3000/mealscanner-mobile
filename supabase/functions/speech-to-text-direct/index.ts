import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SpeechToTextDirectRequest {
  audio_data: string // base64 data URL
  user_id: string
  language?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio_data, user_id, language = 'en' }: SpeechToTextDirectRequest = await req.json()
    
    if (!audio_data || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: audio_data and user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log(`Starting direct speech-to-text for user ${user_id}`)

    // Extract base64 data from data URL
    const base64Data = audio_data.includes(',') ? audio_data.split(',')[1] : audio_data
    
    // Convert base64 to blob
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    const audioBlob = new Blob([bytes], { type: 'audio/m4a' })
    const audioFile = new File([audioBlob], 'audio.m4a', { type: 'audio/m4a' })

    // Call OpenAI Whisper API
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    formData.append('language', language)

    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI Whisper API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`)
    }

    const whisperData = await openaiResponse.json()
    const transcript = whisperData.text

    console.log('Direct speech-to-text completed:', transcript.substring(0, 50) + '...')

    return new Response(
      JSON.stringify({ 
        transcript,
        language: whisperData.language || language
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Direct speech-to-text error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

