/**
 * Daily usage limit for all users (abuse protection).
 *
 * Free users: 3 AI actions/day (enforced server-side).
 * Pro users:  100 AI actions/day (circuit breaker against runaway costs).
 *
 * Counts are based on rows in the `meals` table for the current UTC day.
 */

interface SupabaseLikeClient {
  from(table: string): {
    select(columns: string, options?: { count: string; head: boolean }): {
      eq(column: string, value: string): {
        gte(column: string, value: string): Promise<{ count: number | null; error: { message: string } | null }>;
      };
    };
  };
}

export interface DailyLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  isPro: boolean;
}

const FREE_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT = 100;

export async function checkDailyUserLimit(
  supabase: SupabaseLikeClient,
  userId: string,
  isPro: boolean,
): Promise<DailyLimitResult> {
  const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const today = new Date().toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('meals')
    .select('*', { count: 'exact', head: true } as any)
    .eq('user_id', userId)
    .gte('created_at', today!);

  if (error) {
    console.error('Failed to check daily usage limit:', error.message);
    // Fail open on DB errors so legitimate users aren't blocked
    return { allowed: true, count: 0, limit: dailyLimit, isPro };
  }

  const currentCount = count ?? 0;
  return {
    allowed: currentCount < dailyLimit,
    count: currentCount,
    limit: dailyLimit,
    isPro,
  };
}

export function createDailyLimitResponse(
  result: DailyLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  const now = new Date();
  const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const retryAfterSeconds = Math.ceil((midnightUTC.getTime() - now.getTime()) / 1000);

  const message = result.isPro
    ? "You've hit today's scan limit — looks like you've been busy! This resets at midnight UTC. If you need an exception, reach out to support."
    : 'Daily scan limit reached. Upgrade to Pro for unlimited scans!';

  return new Response(
    JSON.stringify({
      success: false,
      error: 'daily_limit_reached',
      message,
      retryAfter: retryAfterSeconds,
      limit: result.limit,
      count: result.count,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}
