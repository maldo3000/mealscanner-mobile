/**
 * Theme Context
 * 
 * Provides runtime theme switching with persistent storage.
 * 
 * Usage:
 *   import { useTheme } from '@/context/ThemeContext';
 *   const { tokens, themeId, setTheme } = useTheme();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
    DEFAULT_THEME,
    ThemeId,
    ThemeTokens,
    alpha,
    themeNames,
    themes,
    withAlpha,
} from '@/constants/themes';

const THEME_STORAGE_KEY = '@mealscanner_theme';

interface ThemeContextValue {
  /** Current theme ID */
  themeId: ThemeId;
  /** Current theme's semantic tokens */
  tokens: ThemeTokens;
  /** Human-readable theme name */
  themeName: string;
  /** Whether theme is still loading from storage */
  isLoading: boolean;
  /** Switch to a different theme (persisted) */
  setTheme: (id: ThemeId) => Promise<void>;
  /** Toggle between available themes */
  toggleTheme: () => Promise<void>;
  /** Helper: create rgba from accent with opacity */
  accentAlpha: (opacity: number) => string;
  /** Helper: create rgba from any hex with opacity */
  withAlpha: (hex: string, opacity: number) => string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Override initial theme (useful for testing) */
  initialTheme?: ThemeId;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme ?? DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(!initialTheme);

  // Load persisted theme on mount
  useEffect(() => {
    if (initialTheme) return; // Skip if initial theme provided

    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored && (stored === 'herbarium' || stored === 'classicGreen')) {
          setThemeId(stored as ThemeId);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [initialTheme]);

  const setTheme = useCallback(async (id: ThemeId) => {
    setThemeId(id);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
    } catch (error) {
      console.warn('Failed to persist theme preference:', error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextTheme: ThemeId = themeId === 'herbarium' ? 'classicGreen' : 'herbarium';
    await setTheme(nextTheme);
  }, [themeId, setTheme]);

  const tokens = themes[themeId];

  const accentAlpha = useCallback(
    (opacity: number) => alpha(tokens.accentRgb, opacity),
    [tokens.accentRgb]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      tokens,
      themeName: themeNames[themeId],
      isLoading,
      setTheme,
      toggleTheme,
      accentAlpha,
      withAlpha,
    }),
    [themeId, tokens, isLoading, setTheme, toggleTheme, accentAlpha]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme tokens and controls
 * @throws if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to access just the tokens (convenience)
 */
export function useTokens(): ThemeTokens {
  return useTheme().tokens;
}

/**
 * Optional hook that returns undefined if outside provider
 * (useful for components that may render before provider is mounted)
 */
export function useThemeOptional(): ThemeContextValue | undefined {
  return useContext(ThemeContext);
}
