interface ProfileSubscriptionRow {
  subscription_tier?: string | null;
}

interface SupabaseLikeClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        single(): Promise<{ data: ProfileSubscriptionRow | null; error: { message: string } | null }>;
      };
    };
  };
}

export interface ProAccessResult {
  isPro: boolean;
  tier: string;
  error: string | null;
}

/**
 * Resolve Pro access from trusted server-side profile data.
 * Never trust client-provided `is_pro` flags for entitlement checks.
 */
export async function getProAccessForUser(
  supabaseClient: SupabaseLikeClient,
  userId: string,
): Promise<ProAccessResult> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (error) {
    return {
      isPro: false,
      tier: 'free',
      error: error.message || 'Failed to load subscription tier',
    };
  }

  const tier = data?.subscription_tier ?? 'free';
  const isPro = tier === 'pro' || tier === 'premium';

  return { isPro, tier, error: null };
}
