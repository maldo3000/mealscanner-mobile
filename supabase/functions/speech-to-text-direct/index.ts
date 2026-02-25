import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createUnauthorizedResponse, validateUserMatch, verifyAuth } from '../_shared/auth.ts'
import { getSmartCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { getLLMRouter } from '../_shared/llm/router.ts'
import type { LLMConfig } from '../_shared/llm/types.ts'
import { checkRateLimit, createRateLimitResponse, getRateLimitIdentifier, RateLimitPresets } from '../_shared/rateLimit.ts'
import { createValidationErrorResponse, SpeechToTextDirectRequestSchema, validateAudioSize, validateRequest } from '../_shared/validation.ts'

interface SpeechToTextDirectRequest {
  audio_data: string // base64 data URL
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
 * Tokens commonly seen in auto-caption credits when Whisper hallucinates.
 * If the transcript only contains these tokens (and is short), treat as noise.
 */
const CREDIT_TOKENS = new Set([
  'thank',
  'thanks',
  'you',
  'for',
  'watching',
  'listening',
  'viewing',
  'please',
  'like',
  'subscribe',
  'comment',
  'and',
  'to',
  'the',
  'a',
  'an',
  'video',
  'audio',
  'subtitles',
  'by',
])

/**
 * Check if a transcript is likely a Whisper hallucination
 */
function isHallucination(transcript: string): boolean {
  const trimmed = transcript.trim()
  const normalized = trimmed.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = normalized.length > 0 ? normalized.toLowerCase().split(' ') : []
  
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

  // Catch short auto-caption credit phrases like "thank you" or "thanks for watching"
  if (tokens.length > 0 && tokens.length <= 6 && tokens.every((token) => CREDIT_TOKENS.has(token))) {
    console.log(`Filtered hallucination: "${trimmed}" matched credit tokens`)
    return true
  }
  
  return false
}

serve(async (req) => {
  // Get request-aware CORS headers
  const corsHeaders = getSmartCorsHeaders(req)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  try {
    // Verify JWT authentication first
    const auth = await verifyAuth(req)
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders)
    }
    
    // Check rate limit for speech-to-text (expensive operation)
    const rateLimitId = getRateLimitIdentifier(req, auth.userId)
    const rateLimitResult = await checkRateLimit(rateLimitId, RateLimitPresets.speechToText)
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders)
    }

    const rawPayload = await req.json()
    
    // Validate request payload with Zod schema
    const validationResult = validateRequest(SpeechToTextDirectRequestSchema, rawPayload)
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult, corsHeaders)
    }
    
    const { audio_data, user_id: payload_user_id, language = 'en', llm } = rawPayload as SpeechToTextDirectRequest
    
    // Use authenticated user ID, validate if payload specifies one
    if (payload_user_id && !validateUserMatch(auth.userId, payload_user_id)) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch: you can only access your own data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const user_id = auth.userId
    
    // Validate audio file size
    const sizeError = validateAudioSize(audio_data, corsHeaders)
    if (sizeError) {
      return sizeError
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
    console.log('Direct speech-to-text completed:', rawTranscript.substring(0, 50) + '...')

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

