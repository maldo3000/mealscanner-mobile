/**
 * IP Blocklist middleware for Edge Functions
 * Checks incoming requests against the ip_blocklist table
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ==========================================
// IP Extraction
// ==========================================

/**
 * Extract client IP address from request headers
 * Checks various headers set by proxies/load balancers
 */
export function getClientIP(req: Request): string | null {
  // X-Forwarded-For can contain multiple IPs, take the first one (client)
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim())
    if (ips[0]) return ips[0]
  }
  
  // Cloudflare header
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  
  // Real IP header
  const xRealIP = req.headers.get('x-real-ip')
  if (xRealIP) return xRealIP
  
  // Fly.io header
  const flyClientIP = req.headers.get('fly-client-ip')
  if (flyClientIP) return flyClientIP
  
  // Vercel header
  const xVercelForwardedFor = req.headers.get('x-vercel-forwarded-for')
  if (xVercelForwardedFor) return xVercelForwardedFor
  
  return null
}

// ==========================================
// IP Blocklist Checking
// ==========================================

/**
 * Check if an IP address is blocked
 * Uses the is_ip_blocked database function for efficient lookup
 */
export async function isIPBlocked(
  ip: string,
  supabase?: ReturnType<typeof createClient>
): Promise<boolean> {
  if (!ip) return false
  
  // Create Supabase client if not provided
  const client = supabase || createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  try {
    // Use the database function for efficient lookup
    const { data, error } = await client.rpc('is_ip_blocked', { check_ip: ip })
    
    if (error) {
      console.error('Error checking IP blocklist:', error)
      // Fail open - don't block if we can't check
      return false
    }
    
    return data === true
  } catch (error) {
    console.error('IP blocklist check error:', error)
    return false
  }
}

/**
 * Check IP from request against blocklist
 */
export async function checkIPBlocklist(
  req: Request,
  supabase?: ReturnType<typeof createClient>
): Promise<{ blocked: boolean; ip: string | null }> {
  const ip = getClientIP(req)
  
  if (!ip) {
    return { blocked: false, ip: null }
  }
  
  const blocked = await isIPBlocked(ip, supabase)
  
  if (blocked) {
    console.warn(`🚫 Blocked IP attempt: ${ip}`)
  }
  
  return { blocked, ip }
}

// ==========================================
// IP Blocking Response
// ==========================================

/**
 * Create a response for blocked IPs
 */
export function createBlockedIPResponse(
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Access denied',
      message: 'Your IP address has been blocked due to policy violations.',
    }),
    {
      status: 403,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

// ==========================================
// IP Management Functions
// ==========================================

/**
 * Block an IP address
 * For use in admin functions or automated abuse detection
 */
export async function blockIP(
  ip: string,
  reason?: string,
  blockType: 'manual' | 'automatic' | 'abuse' | 'spam' = 'manual',
  expiresAt?: Date,
  blockedBy?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  try {
    const { data, error } = await supabase.rpc('block_ip', {
      p_ip_address: ip,
      p_reason: reason || null,
      p_block_type: blockType,
      p_expires_at: expiresAt?.toISOString() || null,
      p_blocked_by: blockedBy || null,
    })
    
    if (error) {
      console.error('Error blocking IP:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`🚫 IP blocked: ${ip} (${reason || 'No reason'})`)
    return { success: true, id: data }
  } catch (error) {
    console.error('Block IP error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ip: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  try {
    const { data, error } = await supabase.rpc('unblock_ip', { p_ip_address: ip })
    
    if (error) {
      console.error('Error unblocking IP:', error)
      return { success: false, error: error.message }
    }
    
    if (data) {
      console.log(`✅ IP unblocked: ${ip}`)
    }
    return { success: true }
  } catch (error) {
    console.error('Unblock IP error:', error)
    return { success: false, error: String(error) }
  }
}

// ==========================================
// Automatic Abuse Detection
// ==========================================

// In-memory cache for tracking suspicious activity
// Note: This only works within a single Edge Function instance
const suspiciousActivity: Map<string, { count: number; firstSeen: number }> = new Map()

const ABUSE_THRESHOLD = 100 // Requests in time window
const ABUSE_WINDOW_MS = 60000 // 1 minute

/**
 * Track request and check for potential abuse
 * Returns true if IP should be automatically blocked
 */
export function trackAndCheckAbuse(ip: string): boolean {
  if (!ip) return false
  
  const now = Date.now()
  const existing = suspiciousActivity.get(ip)
  
  if (!existing || now - existing.firstSeen > ABUSE_WINDOW_MS) {
    // New window
    suspiciousActivity.set(ip, { count: 1, firstSeen: now })
    return false
  }
  
  // Increment count
  existing.count++
  
  // Check threshold
  if (existing.count >= ABUSE_THRESHOLD) {
    console.warn(`⚠️ Abuse detected from IP: ${ip} (${existing.count} requests in ${ABUSE_WINDOW_MS}ms)`)
    return true
  }
  
  return false
}

/**
 * Middleware to check IP blocklist and track abuse
 * Returns a response if blocked, null if allowed
 */
export async function ipBlocklistMiddleware(
  req: Request,
  corsHeaders: Record<string, string>,
  autoBlock = false
): Promise<Response | null> {
  const { blocked, ip } = await checkIPBlocklist(req)
  
  if (blocked) {
    return createBlockedIPResponse(corsHeaders)
  }
  
  // Optionally track and auto-block abusive IPs
  if (autoBlock && ip && trackAndCheckAbuse(ip)) {
    // Auto-block for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await blockIP(ip, 'Automatic block due to abuse detection', 'automatic', expiresAt)
    return createBlockedIPResponse(corsHeaders)
  }
  
  return null
}
