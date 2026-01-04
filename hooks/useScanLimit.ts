import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_TIER_LIMITS } from '@/lib/revenueCat';
import { useSubscription } from '@/context/SubscriptionContext';

const SCAN_COUNT_KEY = '@mealscanner/daily_scan_count';
const SCAN_DATE_KEY = '@mealscanner/scan_date';

interface ScanLimitState {
  /** Number of scans used today */
  scansUsed: number;
  /** Maximum scans allowed (3 for free, unlimited for Pro) */
  scansAllowed: number;
  /** Remaining scans for free users */
  scansRemaining: number;
  /** Whether user can perform another scan */
  canScan: boolean;
  /** Whether the scan limit data is loading */
  isLoading: boolean;
}

interface UseScanLimitReturn extends ScanLimitState {
  /** Increment the scan counter (call after successful scan) */
  incrementScan: () => Promise<void>;
  /** Reset the scan counter (for testing/admin) */
  resetScanCount: () => Promise<void>;
  /** Refresh the scan count from storage */
  refresh: () => Promise<void>;
}

/**
 * Get today's date as a string key (YYYY-MM-DD)
 */
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Hook to manage daily scan limits for free users
 * Pro users have unlimited scans
 */
export function useScanLimit(): UseScanLimitReturn {
  const { isPro, isLoading: isSubscriptionLoading } = useSubscription();
  
  const [scansUsed, setScansUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const scansAllowed = isPro ? Infinity : FREE_TIER_LIMITS.DAILY_SCANS;
  const scansRemaining = isPro ? Infinity : Math.max(0, scansAllowed - scansUsed);
  const canScan = isPro || scansUsed < FREE_TIER_LIMITS.DAILY_SCANS;

  /**
   * Load scan count from storage, reset if it's a new day
   */
  const loadScanCount = useCallback(async () => {
    try {
      const [storedDate, storedCount] = await Promise.all([
        AsyncStorage.getItem(SCAN_DATE_KEY),
        AsyncStorage.getItem(SCAN_COUNT_KEY),
      ]);

      const today = getTodayKey();

      if (storedDate === today && storedCount !== null) {
        // Same day, use stored count
        setScansUsed(parseInt(storedCount, 10) || 0);
      } else {
        // New day, reset counter
        await AsyncStorage.multiSet([
          [SCAN_DATE_KEY, today],
          [SCAN_COUNT_KEY, '0'],
        ]);
        setScansUsed(0);
      }
    } catch (error) {
      console.error('Failed to load scan count:', error);
      setScansUsed(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load scan count on mount and when subscription status changes
  useEffect(() => {
    if (!isSubscriptionLoading) {
      loadScanCount();
    }
  }, [isSubscriptionLoading, loadScanCount]);

  const incrementScan = useCallback(async () => {
    // Pro users don't need to track scans
    if (isPro) return;

    try {
      const today = getTodayKey();
      const newCount = scansUsed + 1;

      await AsyncStorage.multiSet([
        [SCAN_DATE_KEY, today],
        [SCAN_COUNT_KEY, newCount.toString()],
      ]);

      setScansUsed(newCount);
      console.log(`📊 Scan count updated: ${newCount}/${FREE_TIER_LIMITS.DAILY_SCANS}`);
    } catch (error) {
      console.error('Failed to increment scan count:', error);
    }
  }, [isPro, scansUsed]);

  const resetScanCount = useCallback(async () => {
    try {
      const today = getTodayKey();
      await AsyncStorage.multiSet([
        [SCAN_DATE_KEY, today],
        [SCAN_COUNT_KEY, '0'],
      ]);
      setScansUsed(0);
      console.log('📊 Scan count reset');
    } catch (error) {
      console.error('Failed to reset scan count:', error);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadScanCount();
  }, [loadScanCount]);

  return {
    scansUsed,
    scansAllowed,
    scansRemaining,
    canScan,
    isLoading: isLoading || isSubscriptionLoading,
    incrementScan,
    resetScanCount,
    refresh,
  };
}

