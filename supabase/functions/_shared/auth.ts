/**
 * Shared authentication utilities for Edge Functions
 * Verifies JWT tokens and extracts authenticated user information
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthResult {
  userId: string
  email?: string
}

export interface AuthError {
  message: string
  status: number
}

/**
 * Verifies the JWT token from the Authorization header and returns the authenticated user.
 * This MUST be used instead of trusting userId from request body.
 * 
 * @param req - The incoming request
 * @returns AuthResult with userId if valid, null if invalid/missing
 */
export async function verifyAuth(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('⚠️ Auth: Missing or invalid Authorization header')
    return null
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  if (!token || token.length < 10) {
    console.warn('⚠️ Auth: Token too short or empty')
    return null
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Auth: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) {
      console.warn('⚠️ Auth: Token verification failed:', error.message)
      return null
    }
    
    if (!user) {
      console.warn('⚠️ Auth: No user found for token')
      return null
    }

    console.log('✅ Auth: User verified:', user.id)
    return {
      userId: user.id,
      email: user.email,
    }
  } catch (err) {
    console.error('❌ Auth: Unexpected error during verification:', err)
    return null
  }
}

/**
 * Creates an unauthorized response with proper headers
 */
export function createUnauthorizedResponse(
  corsHeaders: Record<string, string>,
  message = 'Unauthorized: Invalid or missing authentication token'
): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

/**
 * Validates that the authenticated user matches the requested userId (if provided in payload)
 * This prevents users from accessing/modifying other users' data
 */
export function validateUserMatch(
  authUserId: string,
  payloadUserId?: string
): boolean {
  if (!payloadUserId) return true // No userId in payload, use auth userId
  return authUserId === payloadUserId
}
