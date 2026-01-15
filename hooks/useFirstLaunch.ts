import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = '@mealscanner/hasLaunchedBefore';

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
          // First time launching - set the flag for future launches
          setIsFirstLaunch(true);
          await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
        } else {
          setIsFirstLaunch(false);
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
 * Utility to reset the first-launch flag (useful for testing)
 */
export async function resetFirstLaunchFlag(): Promise<void> {
  await AsyncStorage.removeItem(FIRST_LAUNCH_KEY);
}
