import type { NutritionTip } from '@/constants/NutritionTips';
import { NUTRITION_TIPS } from '@/constants/NutritionTips';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Returns a stable local date key (YYYY-MM-DD).
 * Useful for debugging and future personalization.
 */
export function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

/**
 * Computes an integer day ordinal using local midnight.
 * This avoids timezone-based drift when rotating "daily" content.
 */
export function getLocalDayOrdinal(date: Date): number {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(localMidnight.getTime() / MS_PER_DAY);
}

export function getDailyNutritionTip(date: Date = new Date()): NutritionTip {
  const tips = NUTRITION_TIPS;
  if (tips.length === 0) {
    // Should never happen, but keeps callers safe.
    return {
      id: 'tip-fallback',
      title: 'Daily tip',
      summary: 'Small nutrition upgrades add up over time.',
      markdown: `## A tiny win\nPick one small upgrade you can repeat this week.`,
      tags: ['fallback'],
    };
  }

  const ordinal = getLocalDayOrdinal(date);
  const idx = ((ordinal % tips.length) + tips.length) % tips.length;
  return tips[idx];
}

