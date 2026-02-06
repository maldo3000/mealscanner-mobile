# Security Implementation Guide

This document outlines the security hardening implemented for the MealScanner application and any remaining manual steps required.

## Completed Security Implementations

### 1. JWT Authorization Verification
**Status:** Implemented

All Edge Functions now verify JWT tokens from the Authorization header instead of trusting userId from the request body.

**Files created/modified:**
- `supabase/functions/_shared/auth.ts` - Shared auth verification utility
- All edge function files updated to use `verifyAuth()`

**How it works:**
- Extracts JWT from `Authorization: Bearer <token>` header
- Verifies token with Supabase Auth
- Returns authenticated user ID
- Rejects requests with invalid/missing tokens (401)

### 2. Input Validation with Zod
**Status:** Implemented

Comprehensive input validation on both frontend and backend using Zod schemas.

**Files created:**
- `supabase/functions/_shared/validation.ts` - Backend validation schemas
- `lib/validation.ts` - Frontend validation schemas

**Validated inputs:**
- Meal analysis requests (items, images, text)
- Recipe analysis requests
- Speech-to-text requests (including file size limits)
- Login/signup forms
- User profile updates

### 3. CORS Hardening
**Status:** Implemented

Replaced wildcard `*` CORS with dynamic origin validation.

**File created:**
- `supabase/functions/_shared/cors.ts`

**Features:**
- Allowed origins list (configurable via `CORS_ALLOWED_ORIGINS` env var)
- Automatic development mode detection (relaxed CORS for localhost)
- Security headers included automatically

### 4. Security Headers (Helmet-equivalent)
**Status:** Implemented

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cache-Control: no-store, no-cache, must-revalidate`

### 5. File Upload Limits
**Status:** Implemented

**Limits:**
- Images: 10MB maximum
- Audio: 25MB maximum

Validation occurs in edge functions before processing.

### 6. Rate Limiting
**Status:** Implemented

Distributed rate limiting using Upstash Redis (with in-memory fallback).

**File created:**
- `supabase/functions/_shared/rateLimit.ts`

**Rate limits by endpoint type:**
| Endpoint Type | Limit |
|---------------|-------|
| Standard API | 30 req/min |
| AI Analysis | 10 req/min |
| Authentication | 5 req/min |
| Speech-to-Text | 5 req/min |
| Recipe Generation | 5 req/min |
| File Uploads | 20 req/min |

**To enable Upstash Redis:**
1. Create an Upstash account at https://upstash.com
2. Create a Redis database
3. Set environment variables in Supabase:
```bash
supabase secrets set UPSTASH_REDIS_URL=your-url
supabase secrets set UPSTASH_REDIS_TOKEN=your-token
```

### 7. IP Blocklist
**Status:** Implemented

Database-backed IP blocking with automatic abuse detection.

**Migration applied:** `add_ip_blocklist_table`
**File created:** `supabase/functions/_shared/ipBlocklist.ts`

**Features:**
- Manual IP blocking
- Automatic abuse detection (100+ requests/minute triggers auto-block)
- Temporary blocks with expiration
- Block types: manual, automatic, abuse, spam

**Database functions:**
- `is_ip_blocked(ip)` - Check if IP is blocked
- `block_ip(ip, reason, type, expires_at)` - Block an IP
- `unblock_ip(ip)` - Remove IP from blocklist

### 8. SQL Injection Prevention
**Status:** Already Implemented

The Supabase client library uses parameterized queries, preventing SQL injection.

### 9. Password Hashing
**Status:** Already Implemented

Supabase Auth handles password hashing using bcrypt. No additional implementation needed.

### 10. Function Search Path Security
**Status:** Implemented

**Migration applied:** `fix_function_search_paths`

All database functions now have `SET search_path = ''` to prevent search path injection attacks.

---

## Manual Steps Required

### 1. Enable Leaked Password Protection (REQUIRED)

Supabase can check passwords against the HaveIBeenPwned database to prevent users from using compromised passwords.

**Steps:**
1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Enable **"Password Protection"** or **"Check passwords against compromised password database"**
4. Save changes

**Documentation:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### 2. Update Postgres Version (RECOMMENDED)

A Postgres upgrade is available with security patches.

**Steps:**
1. Go to Supabase Dashboard
2. Navigate to **Settings** → **Infrastructure**
3. Click **"Upgrade Database"**
4. Schedule the upgrade during a maintenance window

**Note:** This will cause brief downtime. Plan accordingly.

**Documentation:** https://supabase.com/docs/guides/platform/upgrading

### 3. Configure Upstash Redis for Production (RECOMMENDED)

For production deployments, set up Upstash Redis for distributed rate limiting.

**Steps:**
1. Create account at https://upstash.com
2. Create a new Redis database (regional, not global)
3. Copy REST URL and token
4. Set secrets:
```bash
supabase secrets set UPSTASH_REDIS_URL="https://your-redis-url"
supabase secrets set UPSTASH_REDIS_TOKEN="your-token"
```

### 4. Update CORS Allowed Origins (REQUIRED for Production)

Update `supabase/functions/_shared/cors.ts` with your production domains:

```typescript
const ALLOWED_ORIGINS = [
  'https://your-production-domain.com',
  'https://www.your-production-domain.com',
  // Add your actual domains here
]
```

Or set via environment variable:
```bash
supabase secrets set CORS_ALLOWED_ORIGINS="https://your-domain.com,https://api.your-domain.com"
```

---

## Security Checklist

- [x] JWT token verification on all endpoints
- [x] Input validation with Zod
- [x] CORS configured with allowed origins
- [x] Security headers on all responses
- [x] File upload size limits
- [x] Rate limiting implemented
- [x] IP blocklist with abuse detection
- [x] SQL injection prevention (via Supabase)
- [x] Password hashing (via Supabase Auth)
- [x] Function search paths secured
- [ ] **Manual:** Enable leaked password protection
- [ ] **Manual:** Upgrade Postgres version
- [ ] **Manual:** Configure Upstash Redis for production
- [ ] **Manual:** Update CORS origins for production

---

## Testing Security Features

### Test JWT Verification
```bash
# Should return 401 Unauthorized
curl -X POST https://your-project.supabase.co/functions/v1/analyze-meal-multi \
  -H "Content-Type: application/json" \
  -d '{"items": []}'
```

### Test Rate Limiting
Make 11+ requests in a minute to `/analyze-meal-multi` - should receive 429 Too Many Requests.

### Test Input Validation
```bash
# Should return 400 with validation errors
curl -X POST https://your-project.supabase.co/functions/v1/analyze-meal-multi \
  -H "Authorization: Bearer valid-token" \
  -H "Content-Type: application/json" \
  -d '{"items": "not-an-array"}'
```

### Test IP Blocklist
```sql
-- Block a test IP
SELECT block_ip('192.168.1.100'::inet, 'Test block', 'manual');

-- Verify it's blocked
SELECT is_ip_blocked('192.168.1.100'::inet);

-- Unblock
SELECT unblock_ip('192.168.1.100'::inet);
```

---

## Monitoring

### View Blocked IPs
```sql
SELECT ip_address, reason, block_type, blocked_at, expires_at
FROM ip_blocklist
ORDER BY blocked_at DESC;
```

### View Active Blocks (Non-Expired)
```sql
SELECT ip_address, reason, block_type, blocked_at
FROM ip_blocklist
WHERE expires_at IS NULL OR expires_at > NOW()
ORDER BY blocked_at DESC;
```

### Check Function Logs
Use Supabase Dashboard → Edge Functions → Logs to monitor:
- Authentication failures
- Rate limit hits
- IP blocks
- Validation errors
