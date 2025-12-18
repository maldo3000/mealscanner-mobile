/**
 * MealScanner Spacing System
 * Standardized spacing scale for consistent layout across the app
 */

// Base spacing scale (4px base unit)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

// Page-level spacing constants
export const PageSpacing = {
  containerPadding: Spacing.base, // 16px - standard page padding
  sectionGap: Spacing.xl, // 24px - gap between sections
  cardGap: Spacing.base, // 16px - gap between cards
  elementGap: Spacing.md, // 12px - gap between related elements
  contentPadding: Spacing.base, // 16px - padding inside content areas
} as const;

// Component-level spacing
export const ComponentSpacing = {
  cardPadding: Spacing.lg, // 20px - default card padding
  cardPaddingSmall: Spacing.base, // 16px - small card padding
  cardPaddingLarge: Spacing.xl, // 24px - large card padding
  buttonPadding: Spacing.base, // 16px - button internal padding
  inputPadding: Spacing.base, // 16px - input internal padding
  headerPadding: Spacing.lg, // 20px - header padding
  iconGap: Spacing.sm, // 8px - gap between icon and text
} as const;

// Safe area spacing
export const SafeAreaSpacing = {
  topOffset: Spacing.base, // 16px - additional top offset
  bottomOffset: Spacing.xl, // 24px - bottom content offset
} as const;

