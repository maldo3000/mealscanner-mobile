import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getLLMRouter } from '../_shared/llm/router.ts'
import type { LLMConfig } from '../_shared/llm/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SpeechToTextRequest {
  audio_url: string
  user_id: string
  language?: string
  llm?: LLMConfig
}

/**
 * Common Whisper hallucination patterns that occur with silence or low-quality audio.
 * These are phrases the model tends to generate when there's no clear speech.
 */
const HALLUCINATION_PATTERNS = [
  /^copyright\b/i,
  /\bcopyright\s+(©|\(c\)|at)\b/i,
  /^thank(s| you)\s+(for\s+)?(watching|listening|viewing)/i,
  /^please\s+(like|subscribe|comment)/i,
  /^subscribe\s+(to|and)/i,
  /^\[.*\]$/,  // Just brackets like [Music], [Applause]
  /^♪+$/,  // Just music notes
  /^\.+$/,  // Just dots/periods
  /^-+$/,  // Just dashes
  /^thanks?\s*\.?$/i,  // Just "thanks" or "thank you"
  /^thank you\.?$/i,
  /^bye\.?$/i,
  /^hello\.?$/i,
  /^(the|a|an)\s*\.?$/i,  // Single articles
  /^MoralityTV\.com$/i,  // Known hallucination
  /^www\.\w+\.(com|org|net)$/i,  // Random URLs
  /^Element\s*Animation/i,  // Known hallucination source
  /^Amara\.org$/i,  // Known transcription service hallucination
  /^subtitles?\s+by/i,  // Subtitle credits
  /^transcribed?\s+by/i,
  /^(video|audio)\s+by/i,
]

/**
 * Minimum transcript length to be considered valid (characters).
 * Very short transcripts are likely noise or hallucinations.
 */
const MIN_TRANSCRIPT_LENGTH = 3

/**
 * Check if a transcript is likely a Whisper hallucination
 */
function isHallucination(transcript: string): boolean {
  const trimmed = transcript.trim()
  
  // Too short to be meaningful
  if (trimmed.length < MIN_TRANSCRIPT_LENGTH) {
    return true
  }
  
  // Check against known hallucination patterns
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.log(`Filtered hallucination: "${trimmed}" matched pattern ${pattern}`)
      return true
    }
  }
  
  return false
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio_url, user_id, language = 'en', llm }: SpeechToTextRequest = await req.json()
    
    if (!audio_url || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: audio_url and user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting speech-to-text for user ${user_id}`)

    // Fetch audio file from URL
    const audioResponse = await fetch(audio_url)
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`)
    }

    const audioBlob = await audioResponse.blob()
    const audioFile = new File([audioBlob], 'audio.m4a', { type: 'audio/m4a' })

    // Use LLM router for transcription (will fallback to OpenAI if OpenRouter is requested)
    const llmRouter = getLLMRouter()
    const transcriptionResult = await llmRouter.transcribeAudio(
      {
        audioFile,
        language,
        model: 'whisper-1'
      },
      llm
    )

    const rawTranscript = transcriptionResult.transcript.trim()
    console.log('Speech-to-text completed:', rawTranscript.substring(0, 50) + '...')

    // Filter out hallucinations
    if (isHallucination(rawTranscript)) {
      console.log('Filtered hallucination, returning empty transcript')
      return new Response(
        JSON.stringify({ 
          transcript: '',
          language: transcriptionResult.language || language,
          filtered: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        transcript: rawTranscript,
        language: transcriptionResult.language || language
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Speech-to-text error:', error)
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

