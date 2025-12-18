import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

import { Colors, textMuted, textWhite } from './Colors';

/**
 * MealScanner Typography System
 * Modern, Clean, Sans-Serif (Inter)
 */

// Font families
export const FontFamilies = {
  heading: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
  mono: 'SpaceMono',
};

const WebFontFamilies = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Space Mono', 'Courier New', monospace",
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

export const LineHeights = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 32,
  '2xl': 36,
  '3xl': 40,
  '4xl': 48,
  '5xl': 60,
};

export const TextStyles: Record<string, TextStyle> = {
  h1: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.heading,
    fontSize: FontSizes['4xl'],
    lineHeight: LineHeights['4xl'],
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  h2: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.heading,
    fontSize: FontSizes['3xl'],
    lineHeight: LineHeights['3xl'],
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  h3: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.heading,
    fontSize: FontSizes['2xl'],
    lineHeight: LineHeights['2xl'],
    fontWeight: '600',
    letterSpacing: -0.25,
    color: '#FFFFFF',
  },
  h4: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.heading,
    fontSize: FontSizes.xl,
    lineHeight: LineHeights.xl,
    fontWeight: '600',
    letterSpacing: 0,
    color: '#FFFFFF',
  },
  body: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.body,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  bodySmall: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  caption: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.body,
    fontSize: FontSizes.xs,
    lineHeight: LineHeights.xs,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  button: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.bodyMedium,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.sans : FontFamilies.bodyMedium,
    fontSize: FontSizes.lg,
    lineHeight: LineHeights.lg,
    fontWeight: '500',
    color: textWhite,
  },
};

// Text color variants for consistent usage
export const TextColors = {
  primary: textWhite,
  secondary: textMuted,
  muted: 'rgba(255, 255, 255, 0.5)',
  disabled: 'rgba(255, 255, 255, 0.3)',
} as const;

// Helper function to get text style with color variant
export const getTextStyleWithColor = (
  baseStyle: TextStyle,
  colorVariant: keyof typeof TextColors = 'primary'
): TextStyle => ({
  ...baseStyle,
  color: TextColors[colorVariant],
});
