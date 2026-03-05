/**
 * Fire-and-forget usage logging for AI calls.
 *
 * Inserts a row into `usage_logs` so we can track per-user costs
 * and identify anomalies. Failures are logged but never block the
 * caller's response.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface UsageLogEntry {
  userId: string;
  mealId?: string | null;
  functionName: string;
  action?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isPro?: boolean;
}

let _client: ReturnType<typeof createClient> | null = null;

function getServiceClient() {
  if (!_client) {
    _client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return _client;
}

/**
 * Log an AI usage event. Call without `await` — this should never
 * delay the response to the user.
 */
export function logUsage(entry: UsageLogEntry): void {
  const supabase = getServiceClient();

  supabase
    .from('usage_logs')
    .insert({
      user_id: entry.userId,
      meal_id: entry.mealId ?? null,
      function_name: entry.functionName,
      action: entry.action ?? null,
      model: entry.model ?? null,
      prompt_tokens: entry.promptTokens ?? null,
      completion_tokens: entry.completionTokens ?? null,
      total_tokens: entry.totalTokens ?? null,
      is_pro: entry.isPro ?? false,
    })
    .then(({ error }) => {
      if (error) {
        console.error('Failed to log usage:', error.message);
      }
    });
}
