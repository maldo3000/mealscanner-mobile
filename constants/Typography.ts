import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

import { textMuted, textWhite } from './Colors';

/**
 * MealScanner Typography System
 * Telegraf for headings, Source Sans 3 for body + UI
 */

// Font families - explicit tokens for Telegraf and Source Sans 3
export const FontFamilies = {
  // Telegraf for headings
  headingBold: 'Telegraf_800UltraBold', // Using UltraBold (800) for H1
  headingRegular: 'Telegraf_400Regular', // Using Regular (400) for H2/H3
  
  // Source Sans 3 for body + UI
  body: 'SourceSans3_400Regular',
  bodySemiBold: 'SourceSans3_600SemiBold',
  
  // Keep existing mono
  mono: 'SpaceMono',
} as const;

// Web font fallbacks
const WebFontFamilies = {
  heading: "'Telegraf', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Space Mono', 'Courier New', monospace",
};

// Type scale tokens (for reference, but styles use explicit values)
export const FontSizes = {
  caption: 12,
  small: 14,
  body: 16,
  h3: 18,
  h2: 22,
  h1: 28,
} as const;

export const LineHeights = {
  caption: 16,
  small: 20,
  body: 24,
  h3: 24,
  h2: 28,
  h1: 34,
} as const;

// Text styles with explicit font families and new type scale
export const TextStyles: Record<string, TextStyle> = {
  // Headings - Telegraf
  h1: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.heading : FontFamilies.headingBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: Platform.OS === 'web' ? '800' : undefined, // Using UltraBold (800) font file
    letterSpacing: -0.4, // Tighter tracking for big headlines
    color: '#FFFFFF',
  },
  h2: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.heading : FontFamilies.headingBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: Platform.OS === 'web' ? '800' : undefined,
    letterSpacing: 0, // Neutral tracking
    color: '#FFFFFF',
  },
  h3: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.heading : FontFamilies.headingBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '800' : undefined,
    letterSpacing: 0, // Neutral tracking
    color: '#FFFFFF',
  },
  
  // Body + UI - Source Sans 3
  body: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '400' : undefined,
    color: '#FFFFFF',
  },
  bodySmall: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Platform.OS === 'web' ? '400' : undefined,
    color: 'rgba(255, 255, 255, 0.7)', // Secondary text with lower opacity
  },
  small: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: Platform.OS === 'web' ? '400' : undefined,
    color: '#FFFFFF',
  },
  caption: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: Platform.OS === 'web' ? '400' : undefined,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  
  // UI elements - Source Sans 3 SemiBold
  button: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '600' : undefined,
    letterSpacing: 0.5,
  },
  label: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '600' : undefined,
    color: '#FFFFFF',
  },
  
  // Legacy support (keep for backward compatibility)
  h4: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.heading : FontFamilies.headingBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '800' : undefined,
    letterSpacing: 0,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.bodySemiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '600' : undefined,
    color: textWhite,
  },
  bodyLarge: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.body,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '400' : undefined,
    color: '#FFFFFF',
  },
  bodyMedium: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.body : FontFamilies.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: Platform.OS === 'web' ? '600' : undefined,
    color: '#FFFFFF',
  },
};

// Text color variants for consistent usage
export const TextColors = {
  primary: textWhite,
  secondary: textMuted, // Already has lower opacity
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
