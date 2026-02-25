/**
 * MealScanner Theme System
 * 
 * Two named themes:
 * - Herbarium (Editorial Herbarium): warm cream, sage, matcha - refined & organic
 * - ClassicGreen: vibrant neon green, pure whites - energetic & bold
 * 
 * Usage:
 *   import { useTheme } from '@/context/ThemeContext';
 *   const { tokens } = useTheme();
 *   <View style={{ backgroundColor: tokens.background }} />
 */

// ═══════════════════════════════════════════════════════════
// RAW PALETTES
// ═══════════════════════════════════════════════════════════

/** Editorial Herbarium - warm, organic, refined */
export const HerbariumPalette = {
  // Backgrounds
  ink: '#06251C',
  inkAlt: '#082D22',
  
  // Surfaces
  surface1: '#0C3327',
  surface2: '#103629',
  
  // Borders
  border: '#174539',
  
  // Text
  bone: '#F6F2E9',
  sage: '#A6B8AE',
  
  // Accent
  matcha: '#4ade80',
} as const;

/** Classic Green - vibrant, energetic, bold */
export const ClassicGreenPalette = {
  // Backgrounds
  deepGreen: '#022c22',
  richGreen: '#064e3b',
  
  // Surfaces
  mossGreen: '#065f46',
  elevatedGreen: '#047857',
  
  // Borders
  borderGreen: 'rgba(255, 255, 255, 0.1)',
  
  // Text
  white: '#FFFFFF',
  mutedWhite: 'rgba(255, 255, 255, 0.6)',
  
  // Accent
  neonGreen: '#4ade80',
} as const;

// ═══════════════════════════════════════════════════════════
// SEMANTIC TOKEN SHAPE
// ═══════════════════════════════════════════════════════════

export interface ThemeTokens {
  // Core backgrounds
  background: string;
  backgroundAlt: string;
  
  // Surfaces (cards, inputs, modals)
  surface1: string;
  surface2: string;
  
  // Glass effect surfaces
  glassSurface: string;
  glassBorder: string;
  glassHighlight: string;
  
  // Borders
  border: string;
  borderSubtle: string;
  
  // Text
  textPrimary: string;
  textMuted: string;
  textOnAccent: string;
  
  // Accent
  accent: string;
  accentRgb: string; // For rgba() usage: "r, g, b"
  
  // Semantic colors (shared across themes)
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Chart/macro colors (shared)
  chartProtein: string;
  chartCarbs: string;
  chartFat: string;
}

// ═══════════════════════════════════════════════════════════
// THEME DEFINITIONS
// ═══════════════════════════════════════════════════════════

export const herbariumTokens: ThemeTokens = {
  // Core backgrounds
  background: HerbariumPalette.ink,
  backgroundAlt: HerbariumPalette.inkAlt,
  
  // Surfaces
  surface1: HerbariumPalette.surface1,
  surface2: HerbariumPalette.surface2,
  
  // Glass effects
  glassSurface: HerbariumPalette.surface1,
  glassBorder: HerbariumPalette.border,
  glassHighlight: HerbariumPalette.surface2,
  
  // Borders
  border: HerbariumPalette.border,
  borderSubtle: 'rgba(23, 69, 57, 0.5)', // border at 50%
  
  // Text
  textPrimary: HerbariumPalette.bone,
  textMuted: HerbariumPalette.sage,
  textOnAccent: HerbariumPalette.ink,
  
  // Accent
  accent: HerbariumPalette.matcha,
  accentRgb: '74, 222, 128', // #4ade80
  
  // Semantic (same for both themes)
  success: HerbariumPalette.matcha,
  warning: '#fde047',
  error: '#ef4444',
  info: '#38bdf8',
  
  // Chart colors (same for both)
  chartProtein: '#38bdf8',
  chartCarbs: '#fde047',
  chartFat: '#fb7185',
};

export const classicGreenTokens: ThemeTokens = {
  // Core backgrounds
  background: ClassicGreenPalette.deepGreen,
  backgroundAlt: ClassicGreenPalette.richGreen,
  
  // Surfaces
  surface1: ClassicGreenPalette.mossGreen,
  surface2: ClassicGreenPalette.elevatedGreen,
  
  // Glass effects
  glassSurface: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',
  
  // Borders
  border: ClassicGreenPalette.borderGreen,
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  
  // Text
  textPrimary: ClassicGreenPalette.white,
  textMuted: ClassicGreenPalette.mutedWhite,
  textOnAccent: '#000000',
  
  // Accent
  accent: ClassicGreenPalette.neonGreen,
  accentRgb: '74, 222, 128', // #4ade80
  
  // Semantic
  success: ClassicGreenPalette.neonGreen,
  warning: '#fde047',
  error: '#ef4444',
  info: '#38bdf8',
  
  // Chart colors
  chartProtein: '#38bdf8',
  chartCarbs: '#fde047',
  chartFat: '#fb7185',
};

// ═══════════════════════════════════════════════════════════
// THEME REGISTRY
// ═══════════════════════════════════════════════════════════

export type ThemeId = 'herbarium' | 'classicGreen';

export const themes: Record<ThemeId, ThemeTokens> = {
  herbarium: herbariumTokens,
  classicGreen: classicGreenTokens,
};

export const themeNames: Record<ThemeId, string> = {
  herbarium: 'Editorial Herbarium',
  classicGreen: 'Classic Green',
};

export const DEFAULT_THEME: ThemeId = 'classicGreen';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Create a color with opacity using the theme's accent RGB
 * @example alpha(tokens.accentRgb, 0.2) => "rgba(127, 226, 122, 0.2)"
 */
export function alpha(rgb: string, opacity: number): string {
  return `rgba(${rgb}, ${opacity})`;
}

/**
 * Convert hex to RGB string for use with alpha()
 * @example hexToRgb('#7FE27A') => "127, 226, 122"
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * Create an alpha variant of any hex color
 * @example withAlpha('#7FE27A', 0.2) => "rgba(127, 226, 122, 0.2)"
 */
export function withAlpha(hex: string, opacity: number): string {
  return alpha(hexToRgb(hex), opacity);
}
