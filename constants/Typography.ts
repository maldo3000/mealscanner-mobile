import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

/**
 * MealScanner Typography System
 * Space Grotesk for headers, Inter for body text
 */

// Font families
export const FontFamilies = {
  // Headers - Space Grotesk Regular for all headings
  heading: 'SpaceGrotesk_400Regular',
  headingLight: 'SpaceGrotesk_300Light',
  headingMedium: 'SpaceGrotesk_500Medium',
  headingSemiBold: 'SpaceGrotesk_600SemiBold',
  headingBold: 'SpaceGrotesk_700Bold',
  
  // Body text - Inter
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  
  // Monospace for code/numbers
  mono: 'SpaceMono',
};

// Web font family names (these match the CSS @import names)
const WebFontFamilies = {
  spaceGrotesk: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Space Mono', 'Courier New', monospace",
};

// Typography scale
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

// Line heights
export const LineHeights = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 32,
  '2xl': 36,
  '3xl': 42,
  '4xl': 48,
  '5xl': 64,
};

// Pre-defined text styles
export const TextStyles: Record<string, TextStyle> = {
  // Headers - All using Space Grotesk Regular
  h1: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.spaceGrotesk : FontFamilies.headingBold,
    fontSize: FontSizes['4xl'],
    lineHeight: LineHeights['4xl'],
    fontWeight: Platform.OS === 'web' ? '700' : 'normal',
  } as TextStyle,
  h2: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.spaceGrotesk : FontFamilies.heading,
    fontSize: FontSizes['3xl'],
    lineHeight: LineHeights['3xl'],
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  h3: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.spaceGrotesk : FontFamilies.heading,
    fontSize: FontSizes['2xl'],
    lineHeight: LineHeights['2xl'],
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  h4: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.spaceGrotesk : FontFamilies.heading,
    fontSize: FontSizes.xl,
    lineHeight: LineHeights.xl,
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  
  // Body text - All using Inter
  body: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.body,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  bodyLarge: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.body,
    fontSize: FontSizes.lg,
    lineHeight: LineHeights.lg,
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  bodySmall: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.body,
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  bodyMedium: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.bodyMedium,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: Platform.OS === 'web' ? '500' : 'normal',
  } as TextStyle,
  bodySemiBold: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.bodySemiBold,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: Platform.OS === 'web' ? '600' : 'normal',
  } as TextStyle,
  bodyBold: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.bodyBold,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: Platform.OS === 'web' ? '700' : 'normal',
  } as TextStyle,
  
  // UI elements
  button: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.spaceGrotesk : FontFamilies.heading,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  caption: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.body,
    fontSize: FontSizes.xs,
    lineHeight: LineHeights.xs,
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
  
  // Special
  subtitle: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.inter : FontFamilies.bodySemiBold,
    fontSize: FontSizes.lg,
    lineHeight: LineHeights.lg,
    fontWeight: Platform.OS === 'web' ? '600' : 'normal',
  } as TextStyle,
  mono: {
    fontFamily: Platform.OS === 'web' ? WebFontFamilies.mono : FontFamilies.mono,
    fontSize: FontSizes.base,
    lineHeight: LineHeights.base,
    fontWeight: Platform.OS === 'web' ? '400' : 'normal',
  } as TextStyle,
};

// Helper function to get font family with fallbacks
export const getFontFamily = (fontFamily: string) => {
  if (Platform.OS === 'web') {
    // Web fallbacks
    switch (fontFamily) {
      case FontFamilies.heading:
      case FontFamilies.headingLight:
      case FontFamilies.headingMedium:
      case FontFamilies.headingSemiBold:
      case FontFamilies.headingBold:
        return WebFontFamilies.spaceGrotesk;
      case FontFamilies.body:
      case FontFamilies.bodyMedium:
      case FontFamilies.bodySemiBold:
      case FontFamilies.bodyBold:
        return WebFontFamilies.inter;
      case FontFamilies.mono:
        return WebFontFamilies.mono;
      default:
        return WebFontFamilies.inter;
    }
  }
  return fontFamily;
}; 