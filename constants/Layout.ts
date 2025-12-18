/**
 * MealScanner Layout Constants
 * Standardized layout values for consistent visual design
 */

import { Platform } from 'react-native';

// Border radius values
export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 9999, // Full pill shape
} as const;

// Shadow and elevation values
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#4ade80', // neonGreen
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// Card padding variants
export const CardPadding = {
  none: 0,
  sm: 12,
  md: 20,
  lg: 24,
} as const;

// Header heights
export const HeaderHeights = {
  default: 56,
  large: 72,
  compact: 48,
} as const;

// Standard component dimensions
export const Dimensions = {
  touchTarget: 44, // Minimum touch target for accessibility
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 32,
  buttonHeight: 48,
  buttonHeightSmall: 36,
  buttonHeightLarge: 56,
  inputHeight: 48,
} as const;

// Z-index layers
export const ZIndex = {
  base: 0,
  elevated: 10,
  overlay: 100,
  modal: 1000,
} as const;

