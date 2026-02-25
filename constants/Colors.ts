import { Platform } from 'react-native';

import {
    HerbariumPalette,
    herbariumTokens,
    ThemeTokens
} from './themes';

/**
 * MealScanner Color System
 * 
 * This file provides backward-compatible exports that default to Herbarium.
 * For theme-aware components, use the ThemeContext instead:
 * 
 *   import { useTheme } from '@/context/ThemeContext';
 *   const { tokens, accentAlpha } = useTheme();
 * 
 * Migration guide:
 * - neonGreen → tokens.accent
 * - bgPrimary/deepGreen → tokens.background
 * - textWhite → tokens.textPrimary
 * - textMuted → tokens.textMuted
 * - glassSurface → tokens.glassSurface
 * - glassBorder → tokens.glassBorder
 * - rgba(74, 222, 128, x) → accentAlpha(x)
 */

// ═══════════════════════════════════════════════════════════
// RE-EXPORTS FROM THEMES (prefer using these via ThemeContext)
// ═══════════════════════════════════════════════════════════

export { alpha, withAlpha } from './themes';
export type { ThemeTokens } from './themes';

// ═══════════════════════════════════════════════════════════
// BRAND PALETTE (for direct Brand.* usage)
// ═══════════════════════════════════════════════════════════

export { Brand } from './Brand';

// ═══════════════════════════════════════════════════════════
// LEGACY herbarium OBJECT (for app/_layout.tsx compatibility)
// ═══════════════════════════════════════════════════════════

export const herbarium = {
  backgroundInk: HerbariumPalette.ink,
  backgroundInkAlt: HerbariumPalette.inkAlt,
  surface1: HerbariumPalette.surface1,
  surface2: HerbariumPalette.surface2,
  border: HerbariumPalette.border,
  textPrimary: HerbariumPalette.bone,
  textMuted: HerbariumPalette.sage,
  accentPrimary: HerbariumPalette.matcha,
} as const;

// ═══════════════════════════════════════════════════════════
// STATIC EXPORTS (default to Herbarium for backward compat)
// These are what existing components import directly.
// ═══════════════════════════════════════════════════════════

// Current default tokens (Herbarium)
const tokens = herbariumTokens;

// Base colors
export const deepGreen = tokens.background;
export const richGreen = tokens.backgroundAlt;
export const mossGreen = tokens.surface1;
export const neonGreen = tokens.accent;
export const softMint = tokens.textMuted;

// Glassmorphism tokens
export const glassSurface = tokens.glassSurface;
export const glassBorder = tokens.glassBorder;
export const glassHighlight = tokens.glassHighlight;

// Standard tokens
export const bgPrimary = tokens.background;
export const textWhite = tokens.textPrimary;
export const textMuted = tokens.textMuted;
export const borderLight = tokens.glassBorder;

// Legacy exports mapped to new system
export const primaryGreen = tokens.accent;
export const bgLight = tokens.background;
export const bgSoft = tokens.glassSurface;
export const textMain = tokens.textPrimary;

// Accent colors (shared across themes)
export const accentYellow = '#fde047';
export const accentCoral = '#fb7185';
export const accentSky = '#38bdf8';
export const accentLavender = '#c084fc';

// Semantic color tokens
export const semanticColors = {
  success: tokens.success,
  successLight: tokens.textMuted,
  warning: tokens.warning,
  error: tokens.error,
  errorLight: '#fca5a5',
  info: tokens.info,
  infoLight: '#7dd3fc',
} as const;

// Glass effect opacity variants
export const glassOpacity = {
  surface: 0.05,
  border: 0.1,
  highlight: 0.15,
  overlay: 0.7,
  backdrop: 0.9,
} as const;

// Helper function to create glass colors with opacity
export const createGlassColor = (opacity: number = glassOpacity.surface) =>
  `rgba(255, 255, 255, ${opacity})`;

// Helper function to create colored glass effects
export const createColoredGlass = (color: string, opacity: number = 0.2) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Platform-specific font family
export const getFontFamily = () => {
  if (Platform.OS === 'ios') {
    return 'System';
  } else if (Platform.OS === 'android') {
    return 'sans-serif';
  } else {
    return 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  }
};

// ═══════════════════════════════════════════════════════════
// REACT NAVIGATION THEME OBJECT
// ═══════════════════════════════════════════════════════════

const glassTheme = {
  text: tokens.textPrimary,
  background: tokens.background,
  tint: tokens.accent,
  icon: tokens.textMuted,
  tabIconDefault: tokens.textMuted,
  tabIconSelected: tokens.accent,
  primary: tokens.accent,
  primaryLight: tokens.textMuted,
  primaryDark: tokens.backgroundAlt,
  surface: tokens.glassSurface,
  border: tokens.glassBorder,
  bgLight: tokens.background,
  bgSoft: tokens.glassSurface,
  surface2: tokens.surface2,
};

export const Colors = {
  light: glassTheme,
  dark: glassTheme,
};

// ═══════════════════════════════════════════════════════════
// HELPER: Create theme-aware navigation colors
// Use this in app/_layout.tsx with ThemeContext
// ═══════════════════════════════════════════════════════════

export function createNavigationTheme(themeTokens: ThemeTokens) {
  return {
    text: themeTokens.textPrimary,
    background: themeTokens.background,
    tint: themeTokens.accent,
    icon: themeTokens.textMuted,
    tabIconDefault: themeTokens.textMuted,
    tabIconSelected: themeTokens.accent,
    primary: themeTokens.accent,
    primaryLight: themeTokens.textMuted,
    primaryDark: themeTokens.backgroundAlt,
    surface: themeTokens.glassSurface,
    border: themeTokens.glassBorder,
    bgLight: themeTokens.background,
    bgSoft: themeTokens.glassSurface,
    surface2: themeTokens.surface2,
  };
}
