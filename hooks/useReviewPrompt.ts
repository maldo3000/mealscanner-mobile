import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

import * as StoreReview from 'expo-store-review';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getInstallDate } from '@/hooks/useFirstLaunch';

const REVIEW_PROMPTED_AT_KEY = '@mealscanner/review_prompt_shown_at';
const TOTAL_SCANS_KEY = '@mealscanner/total_scan_count';

const MIN_DAYS_SINCE_INSTALL = 2;
const MIN_TOTAL_SCANS = 3;
const COOLDOWN_DAYS = 90;

async function getDaysSince(isoDate: string): Promise<number> {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

async function getTotalScanCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(TOTAL_SCANS_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

async function incrementTotalScanCount(): Promise<number> {
  const current = await getTotalScanCount();
  const next = current + 1;
  await AsyncStorage.setItem(TOTAL_SCANS_KEY, next.toString());
  return next;
}

async function shouldRequestReview(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return false;

  const installDate = await getInstallDate();
  if (!installDate) return false;

  const daysSinceInstall = await getDaysSince(installDate);
  if (daysSinceInstall < MIN_DAYS_SINCE_INSTALL) return false;

  const totalScans = await getTotalScanCount();
  if (totalScans < MIN_TOTAL_SCANS) return false;

  const lastPrompted = await AsyncStorage.getItem(REVIEW_PROMPTED_AT_KEY);
  if (lastPrompted) {
    const daysSincePrompt = await getDaysSince(lastPrompted);
    if (daysSincePrompt < COOLDOWN_DAYS) return false;
  }

  return true;
}

async function markReviewPrompted(): Promise<void> {
  await AsyncStorage.setItem(REVIEW_PROMPTED_AT_KEY, new Date().toISOString());
}

interface UseReviewPromptReturn {
  /** Call after a successful scan to track count and maybe prompt a review */
  trackSuccessfulScan: () => Promise<void>;
}

/**
 * Hook that tracks successful scans and prompts an App Store / Play Store
 * review when engagement thresholds are met.
 *
 * Conditions: 2+ days since install, 3+ total scans, not prompted in 90 days.
 * The OS may still suppress the dialog based on its own rate limits.
 */
export function useReviewPrompt(): UseReviewPromptReturn {
  const pendingRef = useRef(false);

  const trackSuccessfulScan = useCallback(async (): Promise<void> => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    try {
      await incrementTotalScanCount();

      const shouldPrompt = await shouldRequestReview();
      if (!shouldPrompt) return;

      await markReviewPrompted();
      await StoreReview.requestReview();
    } catch (error) {
      console.warn('Review prompt failed:', error);
    } finally {
      pendingRef.current = false;
    }
  }, []);

  return { trackSuccessfulScan };
}

/**
 * Reset review prompt state (useful for testing)
 */
export async function resetReviewPromptState(): Promise<void> {
  await AsyncStorage.multiRemove([REVIEW_PROMPTED_AT_KEY, TOTAL_SCANS_KEY]);
}
