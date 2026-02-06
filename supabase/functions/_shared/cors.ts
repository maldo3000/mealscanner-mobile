/**
 * CORS Configuration for Edge Functions
 * Restricts cross-origin requests to allowed domains
 */

// Allowed origins - update this list based on your deployment
const ALLOWED_ORIGINS = [
  // Production domains (update these with your actual domains)
  'https://mealscanner.app',
  'https://www.mealscanner.app',
  'https://api.mealscanner.app',
  
  // Supabase project domain
  'https://glzhsfwnsupmmhwzpege.supabase.co',
  
  // Development (Expo)
  'exp://localhost:8081',
  'exp://192.168.1.1:8081', // Local network (adjust IP as needed)
  'exp://127.0.0.1:8081',
  
  // React Native development
  'http://localhost:19006',
  'http://localhost:8081',
  
  // Web development
  'http://localhost:3000',
  'http://localhost:5173', // Vite
]

// Environment variable to add additional origins (comma-separated)
const EXTRA_ORIGINS = Deno.env.get('CORS_ALLOWED_ORIGINS')?.split(',').map(o => o.trim()) || []

const ALL_ALLOWED_ORIGINS = [...ALLOWED_ORIGINS, ...EXTRA_ORIGINS]

/**
 * Security headers to include in all responses (Helmet-equivalent for Deno)
 */
export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * Get CORS headers with dynamic origin validation
 * @param req - The incoming request
 * @returns CORS headers object
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  
  // Check if origin is allowed
  const isAllowed = ALL_ALLOWED_ORIGINS.some(allowed => {
    // Exact match
    if (allowed === origin) return true
    // Pattern match for exp:// with any IP
    if (allowed.startsWith('exp://') && origin.startsWith('exp://')) {
      // Allow any exp:// origin in development
      const isDev = Deno.env.get('SUPABASE_URL')?.includes('localhost') || 
                   Deno.env.get('ENVIRONMENT') === 'development'
      if (isDev) return true
    }
    return false
  })
  
  // If origin is allowed, use it; otherwise, use the first allowed origin
  // This is a security measure - don't reflect unknown origins
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0]
  
  // Log blocked origins for monitoring (only in development)
  if (!isAllowed && origin) {
    console.warn(`⚠️ CORS: Blocked origin "${origin}" - not in allowed list`)
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
    // Include security headers
    ...securityHeaders,
  }
}

/**
 * Get basic CORS headers for development (less restrictive)
 * Only use this in development/testing environments
 */
export function getDevCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    ...securityHeaders,
  }
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const env = Deno.env.get('ENVIRONMENT') || ''
  
  return supabaseUrl.includes('localhost') || 
         supabaseUrl.includes('127.0.0.1') ||
         env === 'development' ||
         env === 'local'
}

/**
 * Smart CORS headers - uses strict CORS in production, relaxed in development
 */
export function getSmartCorsHeaders(req: Request): Record<string, string> {
  if (isDevelopment()) {
    return getDevCorsHeaders()
  }
  return getCorsHeaders(req)
}

/**
 * Creates a preflight response with proper CORS headers
 */
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response('ok', { 
    headers: getSmartCorsHeaders(req),
    status: 204, // No content
  })
}

/**
 * Wraps a response with CORS and security headers
 */
export function withCorsHeaders(
  response: Response,
  req: Request
): Response {
  const headers = new Headers(response.headers)
  const corsHeaders = getSmartCorsHeaders(req)
  
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value)
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
