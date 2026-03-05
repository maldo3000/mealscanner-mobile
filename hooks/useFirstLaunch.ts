import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = '@mealscanner/hasLaunchedBefore';
const INSTALL_DATE_KEY = '@mealscanner/installDate';

interface UseFirstLaunchResult {
  /** Whether this is the user's first time launching the app */
  isFirstLaunch: boolean;
  /** Whether we're still checking AsyncStorage */
  isChecking: boolean;
}

/**
 * Hook to detect if this is the user's first time launching the app.
 * Uses AsyncStorage to persist the "has launched before" flag.
 * 
 * @example
 * ```tsx
 * const { isFirstLaunch, isChecking } = useFirstLaunch();
 * 
 * if (isChecking) return <LoadingIndicator />;
 * 
 * if (isFirstLaunch) {
 *   // Show onboarding or extended intro
 * }
 * ```
 */
export function useFirstLaunch(): UseFirstLaunchResult {
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const hasLaunchedBefore = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        
        if (hasLaunchedBefore === null) {
          setIsFirstLaunch(true);
          await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
          const existingDate = await AsyncStorage.getItem(INSTALL_DATE_KEY);
          if (!existingDate) {
            await AsyncStorage.setItem(INSTALL_DATE_KEY, new Date().toISOString());
          }
        } else {
          setIsFirstLaunch(false);
          // Backfill install date for existing users who upgraded
          const existingDate = await AsyncStorage.getItem(INSTALL_DATE_KEY);
          if (!existingDate) {
            await AsyncStorage.setItem(INSTALL_DATE_KEY, new Date().toISOString());
          }
        }
      } catch (error) {
        // If AsyncStorage fails, treat as returning user (safer default)
        console.warn('Failed to check first launch status:', error);
        setIsFirstLaunch(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkFirstLaunch();
  }, []);

  return { isFirstLaunch, isChecking };
}

/**
 * Returns the ISO date string when the app was first launched, or null if not set.
 */
export async function getInstallDate(): Promise<string | null> {
  return AsyncStorage.getItem(INSTALL_DATE_KEY);
}

/**
 * Utility to reset the first-launch flag (useful for testing)
 */
export async function resetFirstLaunchFlag(): Promise<void> {
  await AsyncStorage.removeItem(FIRST_LAUNCH_KEY);
}
