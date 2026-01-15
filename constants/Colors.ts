import { Platform } from 'react-native';
import { Brand } from './Brand';
import { USE_EDITORIAL_HERBARIUM } from './brandExperiment';

/**
 * MealScanner Color System
 * 
 * Brand colors are defined in Brand.ts - import { Brand } from '@/constants/Brand'
 * This file provides backward-compatible exports and theme configuration.
 */

// Re-export Brand for convenience (prefer importing Brand directly)
export { Brand } from './Brand';

// Legacy herbarium export (use Brand instead)
export const herbarium = {
  backgroundInk: Brand.ink,
  backgroundInkAlt: Brand.inkAlt,
  surface1: Brand.surface1,
  surface2: Brand.surface2,
  border: Brand.border,
  textPrimary: Brand.bone,
  textMuted: Brand.sage,
  accentPrimary: Brand.matcha,
} as const;

// Base colors
export const deepGreen = USE_EDITORIAL_HERBARIUM ? Brand.ink : '#022c22'; // Very dark green background
export const richGreen = USE_EDITORIAL_HERBARIUM ? Brand.inkAlt : '#064e3b'; // Slightly lighter green
export const mossGreen = USE_EDITORIAL_HERBARIUM ? Brand.surface1 : '#065f46'; // Accent background
export const neonGreen = USE_EDITORIAL_HERBARIUM ? Brand.matcha : '#4ade80'; // Primary Action / Glow
export const softMint = USE_EDITORIAL_HERBARIUM ? Brand.sage : '#a7f3d0'; // Secondary Text / Accents

// Glassmorphism tokens
export const glassSurface = USE_EDITORIAL_HERBARIUM ? Brand.surface1 : 'rgba(255, 255, 255, 0.05)';
export const glassBorder = USE_EDITORIAL_HERBARIUM ? Brand.border : 'rgba(255, 255, 255, 0.1)';
export const glassHighlight = USE_EDITORIAL_HERBARIUM ? Brand.surface2 : 'rgba(255, 255, 255, 0.15)';

// Standard Tokens
export const bgPrimary = deepGreen;
export const textWhite = USE_EDITORIAL_HERBARIUM ? Brand.bone : '#FFFFFF';
export const textMuted = USE_EDITORIAL_HERBARIUM ? Brand.sage : 'rgba(255, 255, 255, 0.6)';
export const borderLight = glassBorder;

// Legacy exports mapped to new system
export const primaryGreen = neonGreen;
export const bgLight = bgPrimary;
export const bgSoft = glassSurface;
export const textMain = textWhite;

// Accent colors (Glowing versions)
export const accentYellow = '#fde047'; // Vibrant Yellow
export const accentCoral = '#fb7185'; // Brighter Rose/Coral
export const accentSky = '#38bdf8'; // Vibrant Sky Blue
export const accentLavender = '#c084fc';

// Semantic color tokens
export const semanticColors = {
  success: neonGreen,
  successLight: softMint,
  warning: accentYellow,
  error: '#ef4444', // Red-500
  errorLight: '#fca5a5', // Red-300
  info: accentSky,
  infoLight: '#7dd3fc', // Sky-300
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
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Platform-specific font family
export const getFontFamily = () => {
  if (Platform.OS === 'ios') {
    return 'System'; // Use system font for cleanest look
  } else if (Platform.OS === 'android') {
    return 'sans-serif';
  } else {
    return 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  }
};

const glassTheme = {
  text: textWhite,
  background: bgPrimary,
  tint: neonGreen,
  icon: textMuted,
  tabIconDefault: textMuted,
  tabIconSelected: neonGreen,
  primary: neonGreen,
  primaryLight: softMint,
  primaryDark: richGreen,
  surface: glassSurface,
  border: glassBorder,
  bgLight: bgPrimary,
  bgSoft: glassSurface,
  surface2: USE_EDITORIAL_HERBARIUM ? Brand.surface2 : glassHighlight,
};

export const Colors = {
  light: glassTheme,
  dark: glassTheme,
};
