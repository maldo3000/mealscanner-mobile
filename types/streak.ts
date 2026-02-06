/**
 * Streak System Type Definitions
 * MealScanner - Streak tracking and gamification
 */

// =============================================================================
// CONSTANTS (easily tweakable)
// =============================================================================

/** Minimum meals required per day to count as "logged" */
export const MIN_LOGS_PER_DAY = 1;

/** Hour (24h format) when streak becomes "at risk" if not locked */
export const RISK_START_HOUR = 18; // 6 PM

/** Milestone days that trigger celebrations */
export const MILESTONE_DAYS = [3, 7, 14, 30, 60, 100] as const;

/** Days to earn first shield, then interval for subsequent shields */
export const SHIELD_FIRST_EARN_DAY = 7;
export const SHIELD_EARN_INTERVAL = 14; // Every 14 days after first

/** Maximum number of shields a user can hold */
export const MAX_SHIELDS = 2;

/** Balanced day score threshold (placeholder for future use) */
export const BALANCED_SCORE_THRESHOLD = 70;

// =============================================================================
// ENUMS & TYPES
// =============================================================================

/** Card display state */
export type StreakCardState = 'NOT_LOCKED' | 'LOCKED' | 'AT_RISK';

/** Milestone achievement status */
export interface MilestoneStatus {
  day: number;
  name: string;
  achieved: boolean;
  achievedDate?: string; // ISO date string
}

/** Shield information */
export interface ShieldInfo {
  count: number;
  maxShields: number;
  nextEarnDay: number;
  lastUsedDate?: string;
}

/** Weekly stats for chips */
export interface WeeklyStats {
  /** Days with at least MIN_LOGS_PER_DAY meals this week (Mon-Sun) */
  loggedDaysThisWeek: number;
  /** Days with balanced nutrition this week (placeholder) */
  balancedDaysThisWeek: number;
  /** Week start date (Monday) */
  weekStartDate: string;
}

/** Day log entry for calendar display */
export interface DayLogEntry {
  date: string; // YYYY-MM-DD format
  logged: boolean;
  mealsCount: number;
  isToday: boolean;
}

/** Complete streak summary */
export interface StreakSummary {
  // Core streak data
  currentStreak: number;
  longestStreak: number;
  isLockedToday: boolean;
  mealsLoggedToday: number;
  
  // Card state
  cardState: StreakCardState;
  
  // Shields
  shields: ShieldInfo;
  
  // Milestones
  milestones: MilestoneStatus[];
  nextMilestone: MilestoneStatus | null;
  
  // Weekly stats
  weeklyStats: WeeklyStats;
  
  // Calendar data (last 14 days)
  recentDays: DayLogEntry[];
  
  // Metadata
  lastLogDate: string | null; // ISO date string
  lastComputedAt: string; // ISO timestamp
}

/** Meal data needed for streak calculations */
export interface MealForStreak {
  id: string;
  created_at: string;
  health_score?: 'very_healthy' | 'healthy' | 'needs_improvement';
}

/** AsyncStorage cache structure */
export interface StreakCache {
  summary: StreakSummary;
  cacheKey: string; // Format: userId_YYYY-MM-DD
  version: number;
}

/** Current cache version for invalidation */
export const STREAK_CACHE_VERSION = 1;
export const STREAK_CACHE_KEY = 'streak_summary_cache';

// =============================================================================
// MILESTONE NAMES
// =============================================================================

export const MILESTONE_NAMES: Record<number, string> = {
  3: '3-Day Streak',
  7: 'Week Warrior',
  14: 'Two-Week Champion',
  30: 'Monthly Master',
  60: 'Streak Legend',
  100: 'Century Club',
};

/** Get milestone name by day count */
export function getMilestoneName(day: number): string {
  return MILESTONE_NAMES[day] || `${day}-Day Streak`;
}

/** Get next milestone day from current streak */
export function getNextMilestoneDay(currentStreak: number): number {
  for (const milestone of MILESTONE_DAYS) {
    if (milestone > currentStreak) {
      return milestone;
    }
  }
  // Beyond 100, return next 100 increment
  return Math.ceil((currentStreak + 1) / 100) * 100;
}
