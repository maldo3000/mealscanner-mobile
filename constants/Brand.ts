/**
 * Editorial Herbarium - Official MealScanner Brand Colors
 * 
 * This is the SINGLE SOURCE OF TRUTH for all brand colors.
 * Use these directly when you need brand consistency.
 * 
 * Usage:
 *   import { Brand } from '@/constants/Brand';
 *   <Text style={{ color: Brand.bone }}>MealScanner</Text>
 *   <View style={{ backgroundColor: Brand.ink }} />
 */

export const Brand = {
  // ═══════════════════════════════════════════════════════════
  // BACKGROUNDS
  // ═══════════════════════════════════════════════════════════
  
  /** Primary background - deep ink green (#06251C) */
  ink: '#06251C',
  
  /** Secondary background - slightly lighter (#082D22) */
  inkAlt: '#082D22',

  // ═══════════════════════════════════════════════════════════
  // SURFACES (Cards, Inputs, Containers)
  // ═══════════════════════════════════════════════════════════
  
  /** Surface level 1 - for cards, inputs (#0C3327) */
  surface1: '#0C3327',
  
  /** Surface level 2 - elevated cards, modals (#103629) */
  surface2: '#103629',

  // ═══════════════════════════════════════════════════════════
  // BORDERS
  // ═══════════════════════════════════════════════════════════
  
  /** Subtle border color (#174539) */
  border: '#174539',

  // ═══════════════════════════════════════════════════════════
  // TEXT
  // ═══════════════════════════════════════════════════════════
  
  /** Primary text - warm bone/cream (#F6F2E9) */
  bone: '#F6F2E9',
  
  /** Secondary/muted text - soft sage (#A6B8AE) */
  sage: '#A6B8AE',

  // ═══════════════════════════════════════════════════════════
  // ACCENT
  // ═══════════════════════════════════════════════════════════
  
  /** Primary accent - vibrant matcha green (#7FE27A) */
  matcha: '#7FE27A',
} as const;

export type BrandColors = typeof Brand;

/**
 * Quick reference:
 * 
 * | Token      | Hex       | Use Case                              |
 * |------------|-----------|---------------------------------------|
 * | ink        | #06251C   | Primary backgrounds                   |
 * | inkAlt     | #082D22   | Secondary backgrounds                 |
 * | surface1   | #0C3327   | Cards, inputs, containers             |
 * | surface2   | #103629   | Elevated cards, modals                |
 * | border     | #174539   | Borders, dividers                     |
 * | bone       | #F6F2E9   | Primary text, headings                |
 * | sage       | #A6B8AE   | Secondary text, labels, placeholders  |
 * | matcha     | #7FE27A   | CTAs, accents, interactive elements   |
 */
