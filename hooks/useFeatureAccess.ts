import { useCallback, useMemo } from 'react';

import { useSubscription } from '@/context/SubscriptionContext';
import { FREE_TIER_LIMITS } from '@/lib/revenueCat';
import { useScanLimit } from './useScanLimit';

export interface FeatureAccessResult {
  /** Whether the feature is allowed */
  allowed: boolean;
  /** Reason why the feature is blocked (if not allowed) */
  reason?: string;
  /** Additional context for UI display */
  context?: {
    /** Number of scans remaining (for scan limit) */
    scansRemaining?: number;
    /** Total scans allowed */
    scansAllowed?: number;
    /** Whether user is Pro */
    isPro?: boolean;
  };
}

interface UseFeatureAccessReturn {
  /** Check if user can perform a scan */
  canScan: () => FeatureAccessResult;
  /** Check if user can generate AI recipes */
  canGenerateRecipes: () => FeatureAccessResult;
  /** Check if user has access to full nutrition breakdown */
  hasFullNutrition: () => FeatureAccessResult;
  /** Check if user can re-analyze a meal */
  canReanalyze: () => FeatureAccessResult;
  /** Whether user has Pro subscription */
  isPro: boolean;
  /** Whether subscription data is loading */
  isLoading: boolean;
  /** Show the paywall */
  showPaywall: () => Promise<boolean>;
  /** Scan limit state for display */
  scanLimitState: {
    scansUsed: number;
    scansRemaining: number;
    scansAllowed: number;
    canScan: boolean;
  };
  /** Increment scan count after successful scan */
  incrementScan: () => Promise<void>;
  /** Ensure subscription tier is synced to database before analysis */
  ensureSubscriptionSynced: () => Promise<boolean>;
}

/**
 * Unified hook for checking feature access based on subscription status
 * Combines subscription state with scan limits for consistent feature gating
 */
export function useFeatureAccess(): UseFeatureAccessReturn {
  const { isPro, isLoading: isSubscriptionLoading, showPaywall, ensureSubscriptionSynced } = useSubscription();
  const scanLimit = useScanLimit();

  const isLoading = isSubscriptionLoading || scanLimit.isLoading;

  /**
   * Check if user can perform a scan
   * Free users: limited to 3 scans per day
   * Pro users: unlimited
   */
  const canScan = useCallback((): FeatureAccessResult => {
    if (isPro) {
      return {
        allowed: true,
        context: { isPro: true },
      };
    }

    if (scanLimit.canScan) {
      return {
        allowed: true,
        context: {
          scansRemaining: scanLimit.scansRemaining,
          scansAllowed: FREE_TIER_LIMITS.DAILY_SCANS,
          isPro: false,
        },
      };
    }

    return {
      allowed: false,
      reason: `You've used all ${FREE_TIER_LIMITS.DAILY_SCANS} free scans for today. Upgrade to Pro for unlimited scans!`,
      context: {
        scansRemaining: 0,
        scansAllowed: FREE_TIER_LIMITS.DAILY_SCANS,
        isPro: false,
      },
    };
  }, [isPro, scanLimit.canScan, scanLimit.scansRemaining]);

  /**
   * Check if user can generate AI recipes
   * Free users: cannot generate, only explore
   * Pro users: full access
   */
  const canGenerateRecipes = useCallback((): FeatureAccessResult => {
    if (isPro) {
      return {
        allowed: true,
        context: { isPro: true },
      };
    }

    return {
      allowed: false,
      reason: 'The full recipe database is a Pro feature. Upgrade to unlock recipe access tailored to your nutrition goals!',
      context: { isPro: false },
    };
  }, [isPro]);

  /**
   * Check if user has access to full nutrition breakdown
   * Free users: basic macros only
   * Pro users: detailed breakdown including micronutrients
   */
  const hasFullNutrition = useCallback((): FeatureAccessResult => {
    if (isPro) {
      return {
        allowed: true,
        context: { isPro: true },
      };
    }

    return {
      allowed: false,
      reason: 'Full nutrition breakdown is a Pro feature. Upgrade to see detailed micronutrients and more!',
      context: { isPro: false },
    };
  }, [isPro]);

  /**
   * Check if user can re-analyze a meal
   * Counts against daily scan limit for free users
   */
  const canReanalyze = useCallback((): FeatureAccessResult => {
    // Re-analyze uses the same limit as scanning
    return canScan();
  }, [canScan]);

  const scanLimitState = useMemo(() => ({
    scansUsed: scanLimit.scansUsed,
    scansRemaining: scanLimit.scansRemaining,
    scansAllowed: isPro ? Infinity : FREE_TIER_LIMITS.DAILY_SCANS,
    canScan: scanLimit.canScan,
  }), [scanLimit.scansUsed, scanLimit.scansRemaining, scanLimit.canScan, isPro]);

  return {
    canScan,
    canGenerateRecipes,
    hasFullNutrition,
    canReanalyze,
    isPro,
    isLoading,
    showPaywall,
    scanLimitState,
    incrementScan: scanLimit.incrementScan,
    ensureSubscriptionSynced,
  };
}

