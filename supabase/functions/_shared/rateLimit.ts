/**
 * Rate Limiting utilities for Edge Functions
 * Uses Upstash Redis for distributed rate limiting
 * Falls back to in-memory limiting when Upstash is not configured
 */

// ==========================================
// Configuration
// ==========================================

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number
  
  /**
   * Time window in seconds
   */
  windowSeconds: number
  
  /**
   * Key prefix for rate limit storage
   */
  keyPrefix?: string
}

// Default rate limits by endpoint type
export const RateLimitPresets = {
  // Standard API endpoints: 30 requests per minute
  standard: { maxRequests: 30, windowSeconds: 60 },
  
  // AI/LLM endpoints (expensive): 10 requests per minute
  aiAnalysis: { maxRequests: 10, windowSeconds: 60 },
  
  // Authentication endpoints: 5 requests per minute (prevent brute force)
  auth: { maxRequests: 5, windowSeconds: 60 },
  
  // Speech-to-text (expensive): 5 requests per minute
  speechToText: { maxRequests: 5, windowSeconds: 60 },
  
  // Recipe generation: 5 requests per minute
  recipeGeneration: { maxRequests: 5, windowSeconds: 60 },

  // Weekly reports: infrequent expensive generation
  weeklyReport: { maxRequests: 3, windowSeconds: 3600 },
  
  // File uploads: 20 per minute
  fileUpload: { maxRequests: 20, windowSeconds: 60 },
} as const

// ==========================================
// Rate Limit Result
// ==========================================

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean
  
  /**
   * Number of remaining requests in the current window
   */
  remaining: number
  
  /**
   * Unix timestamp when the rate limit resets
   */
  resetAt: number
  
  /**
   * Total limit for the window
   */
  limit: number
}

// ==========================================
// Upstash Redis Rate Limiter
// ==========================================

/**
 * Rate limiter using Upstash Redis
 * Requires UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN environment variables
 */
export class UpstashRateLimiter {
  private url: string
  private token: string
  
  constructor() {
    this.url = Deno.env.get('UPSTASH_REDIS_URL') || ''
    this.token = Deno.env.get('UPSTASH_REDIS_TOKEN') || ''
  }
  
  isConfigured(): boolean {
    return !!this.url && !!this.token
  }
  
  private async redisCommand(command: string[]): Promise<any> {
    const response = await fetch(`${this.url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    })
    
    if (!response.ok) {
      throw new Error(`Redis command failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.result
  }
  
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - config.windowSeconds
    
    try {
      // Use Redis sorted set for sliding window rate limiting
      // Remove expired entries and count remaining
      await this.redisCommand(['ZREMRANGEBYSCORE', key, '0', String(windowStart)])
      
      const count = await this.redisCommand(['ZCARD', key])
      const remaining = Math.max(0, config.maxRequests - count)
      
      if (count >= config.maxRequests) {
        // Rate limit exceeded
        const oldestEntry = await this.redisCommand(['ZRANGE', key, '0', '0', 'WITHSCORES'])
        const resetAt = oldestEntry && oldestEntry.length > 1 
          ? parseInt(oldestEntry[1]) + config.windowSeconds
          : now + config.windowSeconds
        
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          limit: config.maxRequests,
        }
      }
      
      // Add current request to the window
      await this.redisCommand(['ZADD', key, String(now), `${now}:${Math.random()}`])
      
      // Set expiry on the key to auto-cleanup
      await this.redisCommand(['EXPIRE', key, String(config.windowSeconds)])
      
      return {
        allowed: true,
        remaining: remaining - 1,
        resetAt: now + config.windowSeconds,
        limit: config.maxRequests,
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Fail open in case of Redis errors
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowSeconds,
        limit: config.maxRequests,
      }
    }
  }
}

// ==========================================
// In-Memory Rate Limiter (Fallback)
// ==========================================

/**
 * Simple in-memory rate limiter for development/testing
 * Note: This does NOT work across multiple Edge Function instances
 */
class InMemoryRateLimiter {
  private windows: Map<string, { count: number; resetAt: number }> = new Map()
  
  checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): RateLimitResult {
    const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`
    const now = Math.floor(Date.now() / 1000)
    
    const existing = this.windows.get(key)
    
    // Window expired or doesn't exist
    if (!existing || existing.resetAt <= now) {
      this.windows.set(key, {
        count: 1,
        resetAt: now + config.windowSeconds,
      })
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowSeconds,
        limit: config.maxRequests,
      }
    }
    
    // Check if rate limit exceeded
    if (existing.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
        limit: config.maxRequests,
      }
    }
    
    // Increment counter
    existing.count++
    
    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetAt: existing.resetAt,
      limit: config.maxRequests,
    }
  }
}

// Singleton instances
const upstashLimiter = new UpstashRateLimiter()
const inMemoryLimiter = new InMemoryRateLimiter()

// ==========================================
// Main Rate Limiting Functions
// ==========================================

/**
 * Check rate limit for a request
 * Uses Upstash if configured, falls back to in-memory
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RateLimitPresets.standard
): Promise<RateLimitResult> {
  if (upstashLimiter.isConfigured()) {
    return upstashLimiter.checkRateLimit(identifier, config)
  }
  
  console.warn('⚠️ Upstash Redis not configured - using in-memory rate limiting (not suitable for production)')
  return inMemoryLimiter.checkRateLimit(identifier, config)
}

/**
 * Extract identifier from request for rate limiting
 * Prioritizes: userId > IP address > random (fallback)
 */
export function getRateLimitIdentifier(
  req: Request,
  userId?: string
): string {
  // User ID is best identifier
  if (userId) {
    return `user:${userId}`
  }
  
  // Fall back to IP address
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
         || req.headers.get('cf-connecting-ip')
         || req.headers.get('x-real-ip')
  
  if (ip) {
    return `ip:${ip}`
  }
  
  // Last resort: anonymous identifier
  return `anon:${Math.random().toString(36).substring(7)}`
}

/**
 * Create a rate limit exceeded response with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))
  
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
        'Retry-After': String(retryAfter),
      },
    }
  )
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', String(result.limit))
  headers.set('X-RateLimit-Remaining', String(result.remaining))
  headers.set('X-RateLimit-Reset', String(result.resetAt))
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
